const participants = require("../store/participantStore");

function isRoomMember(roomId, socketId) {

    if (!participants[roomId]) {
        return false;
    }

    return participants[roomId].some(
        (user) => user.socketId === socketId
    );
}

function getRoomMember(roomId, socketId) {

    if (!participants[roomId]) {
        return null;
    }

    return participants[roomId].find(
        (user) => user.socketId === socketId
    ) || null;
}

function isValidDelta(delta) {

    if (!delta) return false;

    if (typeof delta.position !== "number") return false;

    if (typeof delta.deletedLength !== "number") return false;

    if (typeof delta.insertedText !== "string") return false;

    return true;
}

module.exports = {
    getRoomMember,
    isRoomMember,
    isValidDelta,
};
