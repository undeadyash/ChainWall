// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ChainWall V2 Final
/// @notice Decentralized public message wall with posts, edits, deletes,
/// reports, likes, comments and reposts.
contract ChainWallV2 {
    uint256 public constant EDIT_WINDOW = 15 minutes;

    struct Message {
        address sender;
        string username;
        string content;
        uint256 timestamp;
        uint256 id;
        uint256 editedAt;
        bool deleted;
        uint256 reportCount;
        uint256 likeCount;
        uint256 commentCount;
        uint256 repostCount;
    }

    struct Comment {
        uint256 id;
        uint256 messageId;
        address sender;
        string username;
        string content;
        uint256 timestamp;
        bool deleted;
    }

    Message[] private messages;
    Comment[] private comments;

    // Reports
    mapping(uint256 => mapping(address => bool)) public hasReported;

    // Likes
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    // Reposts
    mapping(uint256 => mapping(address => bool)) public hasReposted;

    // Comment deletion
    mapping(uint256 => mapping(address => bool)) public isCommentAuthor;

    event MessagePosted(
        uint256 indexed id,
        address indexed sender,
        string username,
        string content,
        uint256 timestamp
    );

    event MessageEdited(
        uint256 indexed id,
        address indexed sender,
        string content,
        uint256 editedAt
    );

    event MessageDeleted(
        uint256 indexed id,
        address indexed sender,
        uint256 deletedAt
    );

    event MessageReported(
        uint256 indexed id,
        address indexed reporter,
        string reason,
        uint256 reportCount
    );

    event MessageLiked(
        uint256 indexed id,
        address indexed liker,
        uint256 likeCount
    );

    event MessageUnliked(
        uint256 indexed id,
        address indexed liker,
        uint256 likeCount
    );

    event CommentAdded(
        uint256 indexed commentId,
        uint256 indexed messageId,
        address indexed sender,
        string username,
        string content,
        uint256 timestamp
    );

    event CommentDeleted(
        uint256 indexed commentId,
        uint256 indexed messageId,
        address indexed sender,
        uint256 deletedAt
    );

    event MessageReposted(
        uint256 indexed id,
        address indexed reposter,
        uint256 repostCount
    );

    event MessageUnreposted(
        uint256 indexed id,
        address indexed reposter,
        uint256 repostCount
    );

    // =========================================================
    // POSTS
    // =========================================================

    function postMessage(
        string calldata username,
        string calldata content
    ) external {
        require(bytes(username).length > 0, "Username required");
        require(bytes(content).length > 0, "Message required");
        require(bytes(content).length <= 500, "Message too long");

        uint256 messageId = messages.length;

        messages.push(
            Message({
                sender: msg.sender,
                username: username,
                content: content,
                timestamp: block.timestamp,
                id: messageId,
                editedAt: 0,
                deleted: false,
                reportCount: 0,
                likeCount: 0,
                commentCount: 0,
                repostCount: 0
            })
        );

        emit MessagePosted(
            messageId,
            msg.sender,
            username,
            content,
            block.timestamp
        );
    }

    // =========================================================
    // EDIT
    // =========================================================

    function editMessage(
        uint256 id,
        string calldata newContent
    ) external {
        require(id < messages.length, "Message not found");

        Message storage message = messages[id];
        require(
            message.sender == msg.sender,
            "Only author can edit"
        );

        require(!message.deleted, "Message deleted");

        require(
            block.timestamp <= message.timestamp + EDIT_WINDOW,
            "Edit window expired"
        );

        require(
            bytes(newContent).length > 0,
            "Message required"
        );

        require(
            bytes(newContent).length <= 500,
            "Message too long"
        );

        message.content = newContent;
        message.editedAt = block.timestamp;

        emit MessageEdited(
            id,
            msg.sender,
            newContent,
            block.timestamp
        );
    }

    // =========================================================
    // DELETE
    // =========================================================

    function deleteMessage(uint256 id) external {
        require(id < messages.length, "Message not found");

        Message storage message = messages[id];

        require(
            message.sender == msg.sender,
            "Only author can delete"
        );

        require(
            !message.deleted,
            "Message already deleted"
        );

        message.deleted = true;
        message.content = "";

        emit MessageDeleted(
            id,
            msg.sender,
            block.timestamp
        );
    }

    // =========================================================
    // REPORT
    // =========================================================

    function reportMessage(
        uint256 id,
        string calldata reason
    ) external {
        require(id < messages.length, "Message not found");

        require(
            !messages[id].deleted,
            "Message deleted"
        );

        require(
            !hasReported[id][msg.sender],
            "Already reported"
        );

        require(
            bytes(reason).length > 0,
            "Report reason required"
        );

        require(
            bytes(reason).length <= 500,
            "Report reason too long"
        );

        hasReported[id][msg.sender] = true;

        messages[id].reportCount += 1;

        emit MessageReported(
            id,
            msg.sender,
            reason,
            messages[id].reportCount
        );
    }

    // =========================================================
    // LIKE
    // =========================================================

    function likeMessage(uint256 id) external {
        require(id < messages.length, "Message not found");

        require(
            !messages[id].deleted,
            "Message deleted"
        );

        require(
            !hasLiked[id][msg.sender],
            "Already liked"
        );

        hasLiked[id][msg.sender] = true;

        messages[id].likeCount += 1;

        emit MessageLiked(
            id,
            msg.sender,
            messages[id].likeCount
        );
    }

    // =========================================================
    // UNLIKE
    // =========================================================

    function unlikeMessage(uint256 id) external {
        require(id < messages.length, "Message not found");

        require(
            hasLiked[id][msg.sender],
            "Not liked"
        );

        hasLiked[id][msg.sender] = false;

        messages[id].likeCount -= 1;

        emit MessageUnliked(
            id,
            msg.sender,
            messages[id].likeCount
        );
    }

    // =========================================================
    // COMMENT
    // =========================================================

    function addComment(
        uint256 messageId,
        string calldata username,
        string calldata content
    ) external {
        require(
            messageId < messages.length,
            "Message not found"
        );

        require(
            !messages[messageId].deleted,
            "Message deleted"
        );
        require(
            bytes(username).length > 0,
            "Username required"
        );

        require(
            bytes(content).length > 0,
            "Comment required"
        );

        require(
            bytes(content).length <= 500,
            "Comment too long"
        );

        uint256 commentId = comments.length;

        comments.push(
            Comment({
                id: commentId,
                messageId: messageId,
                sender: msg.sender,
                username: username,
                content: content,
                timestamp: block.timestamp,
                deleted: false
            })
        );

        isCommentAuthor[commentId][msg.sender] = true;

        messages[messageId].commentCount += 1;

        emit CommentAdded(
            commentId,
            messageId,
            msg.sender,
            username,
            content,
            block.timestamp
        );
    }

    // =========================================================
    // DELETE COMMENT
    // =========================================================

    function deleteComment(uint256 commentId) external {
        require(
            commentId < comments.length,
            "Comment not found"
        );

        Comment storage comment = comments[commentId];

        require(
            comment.sender == msg.sender,
            "Only comment author can delete"
        );

        require(
            !comment.deleted,
            "Comment already deleted"
        );

        comment.deleted = true;
        comment.content = "";

        messages[comment.messageId].commentCount -= 1;

        emit CommentDeleted(
            commentId,
            comment.messageId,
            msg.sender,
            block.timestamp
        );
    }

    // =========================================================
    // REPOST
    // =========================================================

    function repostMessage(uint256 id) external {
        require(id < messages.length, "Message not found");

        require(
            !messages[id].deleted,
            "Message deleted"
        );

        require(
            !hasReposted[id][msg.sender],
            "Already reposted"
        );

        hasReposted[id][msg.sender] = true;

        messages[id].repostCount += 1;

        emit MessageReposted(
            id,
            msg.sender,
            messages[id].repostCount
        );
    }

    // =========================================================
    // UNREPOST
    // =========================================================

    function unrepostMessage(uint256 id) external {
        require(id < messages.length, "Message not found");

        require(
            hasReposted[id][msg.sender],
            "Not reposted"
        );

        hasReposted[id][msg.sender] = false;

        messages[id].repostCount -= 1;

        emit MessageUnreposted(
            id,
            msg.sender,
            messages[id].repostCount
        );
    }

    // =========================================================
    // MESSAGE GETTERS
    // =========================================================

    function getMessageCount()
        external
        view
        returns (uint256)
    {
        return messages.length;
    }

    function getMessage(uint256 id)
        external
        view
        returns (
            address sender,
            string memory username,
            string memory content,
            uint256 timestamp,
            uint256 messageId,
            uint256 editedAt,
            bool deleted,
            uint256 reportCount,
            uint256 likeCount,
            uint256 commentCount,
            uint256 repostCount
        )
    {
        require(
            id < messages.length,
            "Message not found"
        );

        Message memory message = messages[id];
        return (
            message.sender,
            message.username,
            message.content,
            message.timestamp,
            message.id,
            message.editedAt,
            message.deleted,
            message.reportCount,
            message.likeCount,
            message.commentCount,
            message.repostCount
        );
    }

    // =========================================================
    // COMMENT GETTERS
    // =========================================================

    function getCommentCount()
        external
        view
        returns (uint256)
    {
        return comments.length;
    }

    function getComment(uint256 commentId)
        external
        view
        returns (
            uint256 id,
            uint256 messageId,
            address sender,
            string memory username,
            string memory content,
            uint256 timestamp,
            bool deleted
        )
    {
        require(
            commentId < comments.length,
            "Comment not found"
        );

        Comment memory comment = comments[commentId];

        return (
            comment.id,
            comment.messageId,
            comment.sender,
            comment.username,
            comment.content,
            comment.timestamp,
            comment.deleted
        );
    }

    // =========================================================
    // USER STATE
    // =========================================================

    function getUserMessageState(
        uint256 id,
        address user
    )
        external
        view
        returns (
            bool liked,
            bool reposted,
            bool reported
        )
    {
        require(
            id < messages.length,
            "Message not found"
        );

        return (
            hasLiked[id][user],
            hasReposted[id][user],
            hasReported[id][user]
        );
    }
}