const participants = require("../store/participantStore");

function isRoomMember(roomId, socketId) {

    if (!participants[roomId]) {
        return false;
    }

    return participants[roomId].some(
        (user) => user.socketId === socketId
    );
}

function isValidDelta(delta) {

    if (!delta) return false;

    if (typeof delta.position !== "number") return false;

    if (typeof delta.deletedLength !== "number") return false;

    if (typeof delta.insertedText !== "string") return false;

    return true;
}

module.exports = {
    isRoomMember,
    isValidDelta,
};