// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {
    LSP8Mintable
} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/presets/LSP8Mintable.sol";
import {
    _LSP4_TOKEN_TYPE_COLLECTION
} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";
import {
    _LSP8_TOKENID_FORMAT_NUMBER
} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";

/**
 * @title ChowliveRoom
 * @dev NFT contract for creating and managing Chowlive rooms
 */
contract ChowliveRoom is LSP8Mintable {
    // Room details
    struct Room {
        uint256 id;
        bool isPublic;
        uint256 subscriptionFee;
        uint256 subscriberCount;
        uint256 creationTime;
    }

    // Events
    event RoomCreated(uint256 indexed roomId, address indexed creator, bool isPublic);
    event SubscriptionUpdated(address indexed user, uint256 indexed roomId, uint256 expiration);
    event SubscriptionCancelled(address indexed user, uint256 indexed roomId);
    event SubscriberCountChanged(uint256 indexed roomId, uint256 newCount);
    event PaymentReceived(address indexed user, uint256 indexed roomId, uint256 amount);

    // State variables
    uint256 public roomCreationFee;
    uint256 public lastRoomID;
    mapping(uint256 => Room) public rooms;
    mapping(address => uint256[]) private userSubscribedRooms;
    mapping(address => mapping(uint256 => uint256)) public userSubscriptions;

    // Constants
    uint256 constant SUBSCRIPTION_DURATION = 30 days;

    constructor(
        string memory name,
        string memory symbol,
        address contractOwner,
        uint256 _roomCreationFee
    )
        LSP8Mintable(
            name,
            symbol,
            contractOwner,
            _LSP4_TOKEN_TYPE_COLLECTION,
            _LSP8_TOKENID_FORMAT_NUMBER
        )
    {
        roomCreationFee = _roomCreationFee;
    }

    /**
     * @notice Create a new room
     * @param isPublic Whether the room is public or requires subscription
     * @param subscriptionFee Fee to subscribe to the room (in LYX)
     * @return roomId The ID of the created room
     */
    function createRoom(
        bool isPublic,
        uint256 subscriptionFee
    ) external payable returns (uint256) {
        require(msg.value >= roomCreationFee, "Insufficient LYX sent");

        uint256 roomId = ++lastRoomID;
        
        // Create the room
        rooms[roomId] = Room({
            id: roomId,
            isPublic: isPublic,
            subscriptionFee: subscriptionFee,
            subscriberCount: 1, // Creator is the first subscriber
            creationTime: block.timestamp
        });
        
        // Mint the token
        bytes32 tokenId = bytes32(roomId);
        _mint(msg.sender, tokenId, true, "");
        
        // Update subscriptions
        if (userSubscriptions[msg.sender][roomId] <= block.timestamp) {
            userSubscribedRooms[msg.sender].push(roomId);
        }
        userSubscriptions[msg.sender][roomId] = block.timestamp + SUBSCRIPTION_DURATION;
        
        emit RoomCreated(roomId, msg.sender, isPublic);

        // Refund excess payment
        if (msg.value > roomCreationFee) {
            payable(msg.sender).transfer(msg.value - roomCreationFee);
        }

        return roomId;
    }

    /**
     * @notice Subscribe to a room
     * @param roomId The ID of the room to subscribe to
     */
    function subscribeToRoom(uint256 roomId) external payable {
        Room storage room = rooms[roomId];
        require(room.id != 0, "Room does not exist");
        
        if (!room.isPublic) {
            require(msg.value >= room.subscriptionFee, "Insufficient payment");
        }
        
        _updateSubscription(msg.sender, roomId);
        
        if (msg.value > room.subscriptionFee) {
            payable(msg.sender).transfer(msg.value - room.subscriptionFee);
        }
        
        emit PaymentReceived(msg.sender, roomId, room.subscriptionFee);
    }

    /**
     * @notice Update a user's subscription
     * @param user The user's address
     * @param roomId The ID of the room
     */
    function _updateSubscription(address user, uint256 roomId) internal {
        uint256 currentTime = block.timestamp;
        uint256 newExpiration;
        
        if (userSubscriptions[user][roomId] > currentTime) {
            // Extend existing subscription
            newExpiration = userSubscriptions[user][roomId] + SUBSCRIPTION_DURATION;
        } else {
            // New subscription
            newExpiration = currentTime + SUBSCRIPTION_DURATION;
            
            // Add to user's subscribed rooms if not already present
            bool isAlreadySubscribed = false;
            uint256[] storage userRooms = userSubscribedRooms[user];
            
            for (uint256 i = 0; i < userRooms.length; i++) {
                if (userRooms[i] == roomId) {
                    isAlreadySubscribed = true;
                    break;
                }
            }
            
            if (!isAlreadySubscribed) {
                userSubscribedRooms[user].push(roomId);
            }
        }
        
        userSubscriptions[user][roomId] = newExpiration;
        
        // Update subscriber count
        rooms[roomId].subscriberCount++;
        
        emit SubscriptionUpdated(user, roomId, newExpiration);
        emit SubscriberCountChanged(roomId, rooms[roomId].subscriberCount);
    }

    /**
     * @notice Cancel a subscription
     * @param roomId The ID of the room to cancel subscription for
     */
    function cancelSubscription(uint256 roomId) external {
        uint256[] storage userRooms = userSubscribedRooms[msg.sender];
        
        for (uint256 i = 0; i < userRooms.length; i++) {
            if (userRooms[i] == roomId) {
                // Swap with the last element and remove
                if (i < userRooms.length - 1) {
                    userRooms[i] = userRooms[userRooms.length - 1];
                }
                userRooms.pop();
                
                // Decrease subscriber count
                if (rooms[roomId].subscriberCount > 0) {
                    rooms[roomId].subscriberCount--;
                }
                
                emit SubscriptionCancelled(msg.sender, roomId);
                emit SubscriberCountChanged(roomId, rooms[roomId].subscriberCount);
                break;
            }
        }
    }

    /**
     * @notice Check if a user has access to a room
     * @param user The user's address
     * @param roomId The ID of the room
     * @return Whether the user has access
     */
    function hasAccess(address user, uint256 roomId) public view returns (bool) {
        if (rooms[roomId].isPublic) return true;
        return userSubscriptions[user][roomId] > block.timestamp;
    }

    /**
     * @notice Get all rooms a user has subscribed to
     * @param user The user's address
     * @return Array of room IDs
     */
    function getUserSubscribedRooms(address user) public view returns (uint256[] memory) {
        return userSubscribedRooms[user];
    }

    /**
     * @notice Get all rooms a user has active subscriptions for
     * @param user The user's address
     * @return Array of room IDs
     */
    function getUserActiveSubscriptions(address user) public view returns (uint256[] memory) {
        uint256[] memory allRooms = userSubscribedRooms[user];
        uint256 activeCount = 0;
        
        // Count active subscriptions
        for (uint256 i = 0; i < allRooms.length; i++) {
            if (userSubscriptions[user][allRooms[i]] > block.timestamp) {
                activeCount++;
            }
        }
        
        // Create array of active subscriptions
        uint256[] memory activeRooms = new uint256[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allRooms.length; i++) {
            if (userSubscriptions[user][allRooms[i]] > block.timestamp) {
                activeRooms[index] = allRooms[i];
                index++;
            }
        }
        
        return activeRooms;
    }

    /**
     * @notice Get the number of rooms created by a user
     * @param creator The creator's address
     * @return Number of rooms
     */
    function getRoomsCreated(address creator) public view returns (uint256) {
        return balanceOf(creator);
    }

    /**
     * @notice Withdraw accumulated LYX from the contract
     */
    function withdrawLYX() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No LYX to withdraw");
        payable(owner()).transfer(balance);
    }

    /**
     * @notice Update the room creation fee
     * @param newFee The new fee
     */
    function updateRoomCreationFee(uint256 newFee) external onlyOwner {
        roomCreationFee = newFee;
    }

    /**
     * @notice Check if a room exists
     * @param roomId The ID of the room
     * @return Whether the room exists
     */
    function roomExists(uint256 roomId) public view returns (bool) {
        return rooms[roomId].id != 0;
    }

    /**
     * @notice Get details of a room
     * @param roomId The ID of the room
     * @return Room details
     */
    function getRoomDetails(uint256 roomId) public view returns (Room memory) {
        require(roomExists(roomId), "Room does not exist");
        return rooms[roomId];
    }

    /**
     * @notice Get the subscriber count of a room
     * @param roomId The ID of the room
     * @return Subscriber count
     */
    function getSubscriberCount(uint256 roomId) public view returns (uint256) {
        require(roomExists(roomId), "Room does not exist");
        return rooms[roomId].subscriberCount;
    }
}