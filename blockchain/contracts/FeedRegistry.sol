// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract FeedRegistry {
    struct Feed {
        string cid; // IPFS CID from Akave
        address owner; // Who owns this feed
        uint256 timestamp;
        bool isDeleted; // Tracks if the feed is deleted (true = deleted, false = active)
    }

    Feed[] public feeds;
    mapping(address => uint256[]) public feedsByOwner;

    event FeedCreated(
        address indexed owner,
        uint256 feedId,
        string cid,
        uint256 timestamp
    );
    event FeedUpdated(address indexed owner, uint256 feedId, string newCid);
    event FeedDeleted(address indexed owner, uint256 feedId);

    // Create a new feed (starts as active)
    function createFeed(string memory cid) external {
        require(bytes(cid).length > 0, "CID cannot be empty");
        feeds.push(Feed(cid, msg.sender, block.timestamp, false)); // isDeleted = false (active)
        uint256 feedId = feeds.length - 1;
        feedsByOwner[msg.sender].push(feedId);
        emit FeedCreated(msg.sender, feedId, cid, block.timestamp);
    }

    // Get all feeds owned by an address
    function getFeedsByOwner(address owner)
        external
        view
        returns (Feed[] memory)
    {
        uint256[] memory feedIds = feedsByOwner[owner];
        Feed[] memory ownerFeeds = new Feed[](feedIds.length);

        for (uint256 i = 0; i < feedIds.length; i++) {
            ownerFeeds[i] = feeds[feedIds[i]];
        }

        return ownerFeeds;
    }

    // Get details of a specific feed
    function getFeed(uint256 id)
        external
        view
        returns (
            string memory,
            address,
            uint256,
            bool
        )
    {
        require(id < feeds.length, "Invalid feed ID");
        Feed memory f = feeds[id];
        return (f.cid, f.owner, f.timestamp, f.isDeleted);
    }

    // Update the CID of an existing feed (only if not deleted)
    function updateFeed(uint256 id, string memory newCid) external {
        require(id < feeds.length, "Invalid feed ID");
        Feed storage f = feeds[id];
        require(msg.sender == f.owner, "Not owner");
        require(!f.isDeleted, "Feed is deleted"); // Only allow if not deleted
        require(bytes(newCid).length > 0, "CID cannot be empty");
        f.cid = newCid;
        emit FeedUpdated(msg.sender, id, newCid);
    }

    // Delete a feed (marks as deleted)
    function deleteFeed(uint256 id) external {
        require(id < feeds.length, "Invalid feed ID");
        Feed storage f = feeds[id];
        require(msg.sender == f.owner, "Not owner");
        require(!f.isDeleted, "Feed already deleted"); // Only allow if not already deleted
        f.isDeleted = true; // Mark as deleted
        emit FeedDeleted(msg.sender, id);
    }

    // Get the total number of active (not deleted) feeds
    function getFeedCount() external view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < feeds.length; i++) {
            if (!feeds[i].isDeleted) { // Count only active feeds
                activeCount++;
            }
        }
        return activeCount;
    }
}

//0x45E762AFA6178b82Efbcb3d685bEBF023E2ef6b1