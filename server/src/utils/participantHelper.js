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

    return participants[roomId].map((user) => ({
        username: user.username,
    }));
}

module.exports = {
    addParticipant,
    removeParticipant,
    getParticipantList,
};