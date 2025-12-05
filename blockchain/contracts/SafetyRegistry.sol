// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SafetyRegistry
 * @dev Placeholder contract for future safety ratings and emergency alerts registry
 * @notice This contract will store hashes of safety reports, emergency alerts, and travel intel
 */
contract SafetyRegistry is Ownable {

    struct SafetyReport {
        address reporter;
        bytes32 reportHash;      // SHA-256 hash of safety report data
        uint256 timestamp;
        string reportType;       // 'safety_rating', 'emergency_alert', 'travel_intel'
        bool isVerified;
    }

    // Report ID => Safety Report
    mapping(uint256 => SafetyReport) public reports;

    // Counter for report IDs
    uint256 public reportCount;

    // Events
    event SafetyReportSubmitted(
        uint256 indexed reportId,
        address indexed reporter,
        bytes32 reportHash,
        string reportType
    );

    event SafetyReportVerified(uint256 indexed reportId, address indexed verifier);

    constructor() Ownable() {
        reportCount = 0;
    }

    /**
     * @dev Submit a new safety report (hash only, actual data stored off-chain)
     * @param reportHash SHA-256 hash of the report data
     * @param reportType Type of report ('safety_rating', 'emergency_alert', 'travel_intel')
     * @return reportId The ID of the submitted report
     */
    function submitSafetyReport(bytes32 reportHash, string memory reportType)
        public
        returns (uint256)
    {
        require(reportHash != bytes32(0), "SafetyRegistry: Report hash cannot be empty");
        require(bytes(reportType).length > 0, "SafetyRegistry: Report type cannot be empty");

        uint256 reportId = reportCount;
        reportCount++;

        reports[reportId] = SafetyReport({
            reporter: msg.sender,
            reportHash: reportHash,
            timestamp: block.timestamp,
            reportType: reportType,
            isVerified: false
        });

        emit SafetyReportSubmitted(reportId, msg.sender, reportHash, reportType);
        return reportId;
    }

    /**
     * @dev Verify a safety report (only owner/admin can verify)
     * @param reportId The ID of the report to verify
     */
    function verifySafetyReport(uint256 reportId) public onlyOwner {
        require(reportId < reportCount, "SafetyRegistry: Report does not exist");
        require(!reports[reportId].isVerified, "SafetyRegistry: Report already verified");

        reports[reportId].isVerified = true;

        emit SafetyReportVerified(reportId, msg.sender);
    }

    /**
     * @dev Get a safety report by ID
     * @param reportId The ID of the report to retrieve
     * @return reporter The address of the reporter
     * @return reportHash The hash of the report data
     * @return timestamp The timestamp of the report
     * @return reportType The type of the report
     * @return isVerified Whether the report has been verified
     */
    function getSafetyReport(uint256 reportId)
        public
        view
        returns (
            address reporter,
            bytes32 reportHash,
            uint256 timestamp,
            string memory reportType,
            bool isVerified
        )
    {
        require(reportId < reportCount, "SafetyRegistry: Report does not exist");
        SafetyReport memory report = reports[reportId];
        return (
            report.reporter,
            report.reportHash,
            report.timestamp,
            report.reportType,
            report.isVerified
        );
    }

    /**
     * @dev Get the total number of reports
     * @return The total number of reports submitted
     */
    function getTotalReports() public view returns (uint256) {
        return reportCount;
    }
}
