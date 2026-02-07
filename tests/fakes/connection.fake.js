import { jest } from '@jest/globals';

/**
 * Fake Baileys Connection for Testing
 */
export const createFakeConnection = () => {
    return {
        user: {
            id: 'bot@s.whatsapp.net',
            name: 'Mantra Bot'
        },
        sendMessage: jest.fn().mockResolvedValue({ key: { id: 'SENT_MSG_ID' } }),
        groupParticipantsUpdate: jest.fn().mockResolvedValue([{ status: '200' }]),
        groupInviteCode: jest.fn().mockResolvedValue('TEST_INVITE_CODE'),
        groupRevokeInvite: jest.fn().mockResolvedValue(true),
        profilePictureUrl: jest.fn().mockResolvedValue('https://example.com/pp.jpg'),

        // Mock query for detailed interactions
        query: jest.fn().mockResolvedValue(true),

        // Helper to reset all mocks
        _reset: function () {
            this.sendMessage.mockClear();
            this.groupParticipantsUpdate.mockClear();
            this.groupInviteCode.mockClear();
            this.groupRevokeInvite.mockClear();
            this.profilePictureUrl.mockClear();
            this.query.mockClear();
        }
    };
};
