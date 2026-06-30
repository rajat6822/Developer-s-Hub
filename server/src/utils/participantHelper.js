const participants = require("../store/participantStore");

function addParticipant(roomId, socketId, username) {

    if (!participants[roomId]) {
        participants[roomId] = [];
    }

    const exists = participants[roomId].some(
        (user) => user.socketId === socketId
    );

    if (!exists) {

        participants[roomId].push({
            socketId,
            username,
        });

    }
}

function removeParticipant(roomId, socketId) {

    if (!participants[roomId]) {
        return null;
    }

    const index = participants[roomId].findIndex(
        (user) => user.socketId === socketId
    );

    if (index === -1) {
        return null;
    }

    const removedUser = participants[roomId][index];

    participants[roomId].splice(index, 1);

    if (participants[roomId].length === 0) {
        delete participants[roomId];
    }

    return removedUser;
}

function getParticipantList(roomId) {

    if (!participants[roomId]) {
        return [];
    }

    const uniqueUsers = new Map();

    participants[roomId].forEach((user) => {
        if (!uniqueUsers.has(user.username)) {
            uniqueUsers.set(user.username, {
                username: user.username,
            });
        }
    });

    return [...uniqueUsers.values()];
}

function getParticipantBySocket(roomId, socketId) {

    if (!participants[roomId]) {
        return null;
    }

    return participants[roomId].find((user) => user.socketId === socketId) || null;
}

module.exports = {
    addParticipant,
    getParticipantBySocket,
    removeParticipant,
    getParticipantList,
};
