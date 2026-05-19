// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AgoraEconomicRouter
 * @dev Performance bond and reputation system for Thales autonomous agents.
 * Deployed on Arc Testnet (Chain ID 5042002).
 *
 * CCTP Domain 26 | USDC: 0x3600000000000000000000000000000000000000
 * USYC Teller:  0x9fdF14c5B14173D74C08Af27AebFf39240dC105A
 * FxEscrow:     0x867650F5eAe8df91445971f14d89fd84F0C9a9f8
 *
 * Deploy: npx hardhat deploy --network arc-testnet
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AgoraEconomicRouter {

    // ---- State ----

    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    struct CitizenReputation {
        uint256 stakedBond;      // USDC staked as performance bond (6 decimals)
        uint256 volume;          // Total USDC volume routed (6 decimals)
        uint256 reasoningXP;     // XP accumulated through verified traces
        uint256 successfulHops;  // Count of successful cross-chain settlements
        uint256 lastActionBlock; // Block of last action (for SLA tracking)
        bool    isSlashed;       // Whether bond has been slashed
    }

    mapping(address => CitizenReputation) public citizenStats;

    address public arbiter;
    uint256 public totalBonded;
    uint256 public totalVolume;
    uint256 public totalHops;

    // Minimum bond to become an active routing agent (1 USDC)
    uint256 public constant MIN_BOND = 1_000_000; // 6 decimals

    // SLA: must finalize within this many blocks (~1s on Arc)
    uint256 public constant MAX_FINALITY_BLOCKS = 5;

    // ---- Events ----

    event BondStaked(address indexed agent, uint256 amount);
    event BondWithdrawn(address indexed agent, uint256 amount);
    event RoutingSuccess(address indexed agent, uint256 volume, uint256 xpGain);
    event PerformanceSlash(address indexed agent, uint256 amount, string reason);
    event ReasoningTrace(address indexed agent, bytes32 indexed traceId, string strategy);

    // ---- Modifiers ----

    modifier onlyArbiter() {
        require(msg.sender == arbiter, "Unauthorized: Not the Arbiter");
        _;
    }

    modifier onlyActiveAgent() {
        require(citizenStats[msg.sender].stakedBond >= MIN_BOND, "Insufficient bond");
        require(!citizenStats[msg.sender].isSlashed, "Agent is slashed");
        _;
    }

    // ---- Constructor ----

    constructor() {
        arbiter = msg.sender;
    }

    // ---- Bond Management ----

    /**
     * @dev Stake USDC as a performance bond to activate as a routing agent.
     * Requires prior USDC approval to this contract.
     */
    function stakePerformanceBond(uint256 amount) external {
        require(amount >= MIN_BOND, "Bond below minimum (1 USDC)");
        require(USDC.transferFrom(msg.sender, address(this), amount), "USDC transfer failed");

        citizenStats[msg.sender].stakedBond += amount;
        totalBonded += amount;

        emit BondStaked(msg.sender, amount);
    }

    /**
     * @dev Withdraw bond if not slashed and no active routes.
     */
    function withdrawBond(uint256 amount) external {
        CitizenReputation storage stats = citizenStats[msg.sender];
        require(!stats.isSlashed, "Cannot withdraw: agent is slashed");
        require(stats.stakedBond >= amount, "Insufficient bonded amount");

        stats.stakedBond -= amount;
        totalBonded -= amount;

        require(USDC.transfer(msg.sender, amount), "USDC transfer failed");
        emit BondWithdrawn(msg.sender, amount);
    }

    // ---- Routing Verification ----

    /**
     * @dev Record a successful routing event. Called by Arbiter after verifying
     * the reasoning trace hash matches the on-chain execution.
     */
    function verifyRoutingSuccess(
        address agent,
        uint256 volume,
        bytes32 traceId,
        string calldata strategy
    ) external onlyArbiter {
        CitizenReputation storage stats = citizenStats[agent];
        stats.volume          += volume;
        stats.successfulHops  += 1;
        stats.lastActionBlock  = block.number;

        // XP: 10 XP per 1 USDC routed (volume in 6 decimals)
        uint256 xpGain = (volume / 1_000_000) * 10;
        stats.reasoningXP += xpGain;

        totalVolume += volume;
        totalHops   += 1;

        emit RoutingSuccess(agent, volume, xpGain);
        emit ReasoningTrace(agent, traceId, strategy);
    }

    /**
     * @dev Submit a reasoning trace hash on-chain for immutable audit trail.
     * Any active agent can call this to pin their Gemini reasoning to Arc.
     */
    function submitReasoningTrace(
        bytes32 traceId,
        string calldata strategy,
        uint256 estimatedAlpha
    ) external onlyActiveAgent {
        citizenStats[msg.sender].lastActionBlock = block.number;
        emit ReasoningTrace(msg.sender, traceId, strategy);
    }

    // ---- Slashing ----

    /**
     * @dev Slash an agent's bond for SLA violation (missed finality, slippage breach).
     * The slashed USDC is sent to the treasury (arbiter) for redistribution.
     */
    function slashPerformance(
        address agent,
        uint256 penaltyAmount,
        string calldata reason
    ) external onlyArbiter {
        CitizenReputation storage stats = citizenStats[agent];
        require(stats.stakedBond >= penaltyAmount, "Insufficient bond to slash");

        stats.stakedBond -= penaltyAmount;
        stats.isSlashed   = true;
        totalBonded      -= penaltyAmount;

        // Send penalty to arbiter (treasury)
        require(USDC.transfer(arbiter, penaltyAmount), "Slash transfer failed");

        emit PerformanceSlash(agent, penaltyAmount, reason);
    }

    /**
     * @dev Arbiter can reinstate a slashed agent after remediation.
     */
    function reinstateAgent(address agent) external onlyArbiter {
        citizenStats[agent].isSlashed = false;
    }

    // ---- Views ----

    /**
     * @dev Priority score based on reasoning XP (used for queue ordering).
     */
    function getRoutingPriority(address agent) public view returns (uint256) {
        if (citizenStats[agent].isSlashed) return 0;
        if (citizenStats[agent].stakedBond < MIN_BOND) return 0;
        return citizenStats[agent].reasoningXP;
    }

    /**
     * @dev Protocol-level stats.
     */
    function getProtocolStats() external view returns (
        uint256 _totalBonded,
        uint256 _totalVolume,
        uint256 _totalHops
    ) {
        return (totalBonded, totalVolume, totalHops);
    }

    // ---- Admin ----

    function transferArbiter(address newArbiter) external onlyArbiter {
        arbiter = newArbiter;
    }
}
