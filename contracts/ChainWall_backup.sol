// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChainWall {
    struct Message {
        address sender;
        string username;
        string content;
        uint256 timestamp;
        uint256 id;
    }

    Message[] private messages;

    event MessagePosted(
        uint256 indexed id,
        address indexed sender,
        string username,
        string content,
        uint256 timestamp
    );

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
                id: messageId
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

    function getMessageCount() external view returns (uint256) {
        return messages.length;
    }

    function getMessage(
        uint256 id
    )
        external
        view
        returns (
            address sender,
            string memory username,
            string memory content,
            uint256 timestamp,
            uint256 messageId
        )
    {
        require(id < messages.length, "Message does not exist");

        Message memory message = messages[id];

        return (
            message.sender,
            message.username,
            message.content,
            message.timestamp,
            message.id
        );
    }
}