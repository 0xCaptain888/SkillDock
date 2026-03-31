use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Transfer as SplTransfer};

declare_id!("SKiLLDocKReG1stRyPr0gRaMiD11111111111111");

// ---------------------------------------------------------------------------
// Program entry
// ---------------------------------------------------------------------------
#[program]
pub mod skill_registry {
    use super::*;

    /// Initialize the global registry state. Called once by the deployer.
    pub fn initialize(
        ctx: Context<Initialize>,
        protocol_fee_bps: u16,
        dao_fee_bps: u16,
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.authority = ctx.accounts.authority.key();
        registry.total_skills = 0;
        registry.merkle_root = [0u8; 32];
        registry.treasury = ctx.accounts.treasury.key();
        registry.protocol_fee_bps = protocol_fee_bps;
        registry.dao_fee_bps = dao_fee_bps;
        registry.bump = ctx.bumps.registry;
        Ok(())
    }

    /// A skill creator registers a new skill NFT in the on-chain registry.
    pub fn register_skill(
        ctx: Context<RegisterSkill>,
        capability_hash: [u8; 32],
        version: u16,
    ) -> Result<()> {
        let clock = Clock::get()?;
        let registry = &mut ctx.accounts.registry;
        let entry = &mut ctx.accounts.skill_entry;

        entry.skill_nft = ctx.accounts.skill_nft_mint.key();
        entry.creator = ctx.accounts.creator.key();
        entry.capability_hash = capability_hash;
        entry.version = version;
        entry.status = SkillStatus::Active;
        entry.total_acquisitions = 0;
        entry.total_rating_sum = 0;
        entry.rating_count = 0;
        entry.registered_at = clock.unix_timestamp;
        entry.updated_at = clock.unix_timestamp;
        entry.bump = ctx.bumps.skill_entry;

        registry.total_skills = registry.total_skills.checked_add(1).unwrap();

        emit!(SkillRegistered {
            skill_nft: entry.skill_nft,
            creator: entry.creator,
            capability_hash,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// An agent acquires a skill: pays SOL (split 85/10/5), receives NFT,
    /// and an AcquisitionRecord is created atomically.
    pub fn acquire_skill(ctx: Context<AcquireSkill>, price: u64) -> Result<()> {
        let skill = &ctx.accounts.skill_entry;

        // --- Guard: skill must be active ---
        require!(skill.status == SkillStatus::Active, SkillRegistryError::SkillNotActive);

        // --- Guard: creator account must match ---
        require!(
            ctx.accounts.creator.key() == skill.creator,
            SkillRegistryError::Unauthorized
        );

        // --- Guard: treasury must match registry ---
        require!(
            ctx.accounts.treasury.key() == ctx.accounts.registry.treasury,
            SkillRegistryError::Unauthorized
        );

        // --- SOL split: 85% creator, 10% treasury, 5% DAO ---
        let creator_share = price
            .checked_mul(8500).unwrap()
            .checked_div(10000).unwrap();
        let treasury_share = price
            .checked_mul(1000).unwrap()
            .checked_div(10000).unwrap();
        let dao_share = price
            .checked_sub(creator_share).unwrap()
            .checked_sub(treasury_share).unwrap();

        // Transfer SOL to creator
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.agent.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
            ),
            creator_share,
        )?;

        // Transfer SOL to treasury
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.agent.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            treasury_share,
        )?;

        // Transfer SOL to DAO
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.agent.to_account_info(),
                    to: ctx.accounts.dao_treasury.to_account_info(),
                },
            ),
            dao_share,
        )?;

        // --- Transfer the skill NFT from creator to agent ---
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                SplTransfer {
                    from: ctx.accounts.creator_skill_ata.to_account_info(),
                    to: ctx.accounts.agent_skill_ata.to_account_info(),
                    authority: ctx.accounts.token_authority.to_account_info(),
                },
            ),
            1, // NFTs have amount = 1
        )?;

        // --- Update skill entry counters ---
        let skill = &mut ctx.accounts.skill_entry;
        let clock = Clock::get()?;
        skill.total_acquisitions = skill.total_acquisitions.checked_add(1).unwrap();
        skill.updated_at = clock.unix_timestamp;

        // --- Create acquisition record ---
        let acq = &mut ctx.accounts.acquisition;
        acq.agent = ctx.accounts.agent.key();
        acq.skill_nft = skill.skill_nft;
        acq.price_paid = price;
        acq.acquired_at = clock.unix_timestamp;
        acq.rating = 0; // not yet rated
        acq.bump = ctx.bumps.acquisition;

        emit!(SkillAcquired {
            agent: acq.agent,
            skill_nft: acq.skill_nft,
            creator: skill.creator,
            price,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// An agent that acquired a skill rates it (1-100).
    pub fn rate_skill(ctx: Context<RateSkill>, rating: u8) -> Result<()> {
        require!(rating >= 1 && rating <= 100, SkillRegistryError::InvalidRating);

        let acq = &mut ctx.accounts.acquisition;
        require!(acq.rating == 0, SkillRegistryError::AlreadyRated);

        acq.rating = rating;

        let skill = &mut ctx.accounts.skill_entry;
        let clock = Clock::get()?;
        skill.total_rating_sum = skill.total_rating_sum.checked_add(rating as u64).unwrap();
        skill.rating_count = skill.rating_count.checked_add(1).unwrap();
        skill.updated_at = clock.unix_timestamp;

        emit!(SkillRated {
            agent: ctx.accounts.agent.key(),
            skill_nft: skill.skill_nft,
            rating,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// The skill creator deprecates their own skill.
    pub fn deprecate_skill(ctx: Context<DeprecateSkill>) -> Result<()> {
        let skill = &mut ctx.accounts.skill_entry;
        require!(
            skill.status == SkillStatus::Active,
            SkillRegistryError::InvalidStatus
        );

        let clock = Clock::get()?;
        skill.status = SkillStatus::Deprecated;
        skill.updated_at = clock.unix_timestamp;

        emit!(SkillDeprecated {
            skill_nft: skill.skill_nft,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// Any user can flag a skill by staking 0.01 SOL to the treasury.
    pub fn flag_skill(ctx: Context<FlagSkill>) -> Result<()> {
        let skill = &mut ctx.accounts.skill_entry;
        require!(
            skill.status == SkillStatus::Active,
            SkillRegistryError::InvalidStatus
        );

        // Verify treasury matches
        require!(
            ctx.accounts.treasury.key() == ctx.accounts.registry.treasury,
            SkillRegistryError::Unauthorized
        );

        // Stake 0.01 SOL (10_000_000 lamports)
        let flag_stake: u64 = 10_000_000;
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.flagger.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            flag_stake,
        )?;

        let clock = Clock::get()?;
        skill.status = SkillStatus::Flagged;
        skill.updated_at = clock.unix_timestamp;

        emit!(SkillFlagged {
            skill_nft: skill.skill_nft,
            flagger: ctx.accounts.flagger.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    /// The registry authority updates the global Merkle root.
    pub fn update_merkle_root(
        ctx: Context<UpdateMerkleRoot>,
        new_root: [u8; 32],
    ) -> Result<()> {
        let registry = &mut ctx.accounts.registry;
        registry.merkle_root = new_root;
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/// Lifecycle status of a registered skill.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SkillStatus {
    Active     = 0,
    Deprecated = 1,
    Flagged    = 2,
    Suspended  = 3,
}

// ---------------------------------------------------------------------------
// State accounts
// ---------------------------------------------------------------------------

/// Global singleton that stores protocol-wide configuration.
/// PDA seeds: ["registry"]
#[account]
pub struct RegistryState {
    /// The deployer / governance key that can update protocol params.
    pub authority: Pubkey,
    /// Running counter of all skills ever registered.
    pub total_skills: u64,
    /// Off-chain Merkle root committing to the full skill catalogue.
    pub merkle_root: [u8; 32],
    /// Treasury wallet that receives the protocol fee cut.
    pub treasury: Pubkey,
    /// Protocol fee in basis points (e.g. 1000 = 10%).
    pub protocol_fee_bps: u16,
    /// DAO fee in basis points (e.g. 500 = 5%).
    pub dao_fee_bps: u16,
    /// PDA bump.
    pub bump: u8,
}

/// On-chain record for a single registered skill NFT.
/// PDA seeds: ["skill", skill_nft_mint]
#[account]
pub struct SkillEntry {
    /// Mint address of the skill NFT.
    pub skill_nft: Pubkey,
    /// Wallet of the skill creator.
    pub creator: Pubkey,
    /// SHA-256 hash of the canonical capability descriptor (SAP-1).
    pub capability_hash: [u8; 32],
    /// Semantic version counter maintained by the creator.
    pub version: u16,
    /// Current lifecycle status.
    pub status: SkillStatus,
    /// How many agents have acquired this skill.
    pub total_acquisitions: u64,
    /// Sum of all ratings received (used to compute average).
    pub total_rating_sum: u64,
    /// Number of ratings received.
    pub rating_count: u64,
    /// Unix timestamp when the skill was first registered.
    pub registered_at: i64,
    /// Unix timestamp of the last state change.
    pub updated_at: i64,
    /// PDA bump.
    pub bump: u8,
}

/// Tracks that a specific agent has acquired a specific skill.
/// PDA seeds: ["acquisition", agent, skill_nft_mint]
#[account]
pub struct AcquisitionRecord {
    /// The agent wallet that acquired the skill.
    pub agent: Pubkey,
    /// Mint address of the acquired skill NFT.
    pub skill_nft: Pubkey,
    /// SOL lamports paid at acquisition time.
    pub price_paid: u64,
    /// Unix timestamp of acquisition.
    pub acquired_at: i64,
    /// Rating given by the agent (0 = not yet rated).
    pub rating: u8,
    /// PDA bump.
    pub bump: u8,
}

// ---------------------------------------------------------------------------
// Instruction account structs
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 32 + 32 + 2 + 2 + 1, // discriminator + fields
        seeds = [b"registry"],
        bump,
    )]
    pub registry: Account<'info, RegistryState>,

    /// The treasury wallet that will receive protocol fees.
    /// CHECK: We only store this pubkey; no data is read.
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterSkill<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, RegistryState>,

    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 32 + 32 + 2 + 1 + 8 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"skill", skill_nft_mint.key().as_ref()],
        bump,
    )]
    pub skill_entry: Account<'info, SkillEntry>,

    /// The mint of the skill NFT being registered.
    /// CHECK: Validated by PDA derivation; creator must own it off-chain.
    pub skill_nft_mint: UncheckedAccount<'info>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AcquireSkill<'info> {
    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, RegistryState>,

    #[account(
        mut,
        seeds = [b"skill", skill_entry.skill_nft.as_ref()],
        bump = skill_entry.bump,
    )]
    pub skill_entry: Account<'info, SkillEntry>,

    #[account(
        init,
        payer = agent,
        space = 8 + 32 + 32 + 8 + 8 + 1 + 1,
        seeds = [b"acquisition", agent.key().as_ref(), skill_entry.skill_nft.as_ref()],
        bump,
    )]
    pub acquisition: Account<'info, AcquisitionRecord>,

    /// The skill creator who receives the majority of the payment.
    /// CHECK: Verified against skill_entry.creator in the handler.
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,

    /// The protocol treasury.
    /// CHECK: Verified against registry.treasury in the handler.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    /// The DAO treasury.
    /// CHECK: Stored off-chain; passed by the client.
    #[account(mut)]
    pub dao_treasury: UncheckedAccount<'info>,

    /// The creator's token account holding the skill NFT.
    #[account(mut)]
    pub creator_skill_ata: Account<'info, TokenAccount>,

    /// The agent's token account that will receive the skill NFT.
    #[account(mut)]
    pub agent_skill_ata: Account<'info, TokenAccount>,

    /// Authority over the creator's token account (typically the creator).
    pub token_authority: Signer<'info>,

    #[account(mut)]
    pub agent: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RateSkill<'info> {
    #[account(
        mut,
        seeds = [b"skill", skill_entry.skill_nft.as_ref()],
        bump = skill_entry.bump,
    )]
    pub skill_entry: Account<'info, SkillEntry>,

    #[account(
        mut,
        seeds = [b"acquisition", agent.key().as_ref(), skill_entry.skill_nft.as_ref()],
        bump = acquisition.bump,
        constraint = acquisition.agent == agent.key() @ SkillRegistryError::Unauthorized,
    )]
    pub acquisition: Account<'info, AcquisitionRecord>,

    pub agent: Signer<'info>,
}

#[derive(Accounts)]
pub struct DeprecateSkill<'info> {
    #[account(
        mut,
        seeds = [b"skill", skill_entry.skill_nft.as_ref()],
        bump = skill_entry.bump,
        constraint = skill_entry.creator == creator.key() @ SkillRegistryError::Unauthorized,
    )]
    pub skill_entry: Account<'info, SkillEntry>,

    pub creator: Signer<'info>,
}

#[derive(Accounts)]
pub struct FlagSkill<'info> {
    #[account(
        mut,
        seeds = [b"skill", skill_entry.skill_nft.as_ref()],
        bump = skill_entry.bump,
    )]
    pub skill_entry: Account<'info, SkillEntry>,

    /// The protocol treasury receives the flagging stake.
    /// CHECK: Verified against registry.treasury in the handler.
    #[account(mut)]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
    )]
    pub registry: Account<'info, RegistryState>,

    #[account(mut)]
    pub flagger: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateMerkleRoot<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = authority @ SkillRegistryError::Unauthorized,
    )]
    pub registry: Account<'info, RegistryState>,

    pub authority: Signer<'info>,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct SkillRegistered {
    pub skill_nft: Pubkey,
    pub creator: Pubkey,
    pub capability_hash: [u8; 32],
    pub timestamp: i64,
}

#[event]
pub struct SkillAcquired {
    pub agent: Pubkey,
    pub skill_nft: Pubkey,
    pub creator: Pubkey,
    pub price: u64,
    pub timestamp: i64,
}

#[event]
pub struct SkillRated {
    pub agent: Pubkey,
    pub skill_nft: Pubkey,
    pub rating: u8,
    pub timestamp: i64,
}

#[event]
pub struct SkillDeprecated {
    pub skill_nft: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SkillFlagged {
    pub skill_nft: Pubkey,
    pub flagger: Pubkey,
    pub timestamp: i64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum SkillRegistryError {
    #[msg("Skill is not in Active status")]
    SkillNotActive,
    #[msg("Agent has already acquired this skill")]
    AlreadyAcquired,
    #[msg("Insufficient SOL to complete the transaction")]
    InsufficientFunds,
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Rating must be between 1 and 100")]
    InvalidRating,
    #[msg("Agent has already rated this skill")]
    AlreadyRated,
    #[msg("Skill is in an invalid status for this operation")]
    InvalidStatus,
}
