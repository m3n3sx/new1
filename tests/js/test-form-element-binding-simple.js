/**
 * Simple test to verify LASFormElementBinder class is available
 */

// Import the admin settings file
const { LASFormElementBinder } = require('../../js/admin-settings.js');

describe('LASFormElementBinder Class Availability', () => {
    test('should have LASFormElementBinder class defined', () => {
        expect(typeof LASFormElementBinder).toBe('function');
    });
    
    test('should be able to create instance', () => {
        const mockCore = { get: jest.fn(), handleError: jest.fn(), emit: jest.fn() };
        const mockSettings = { set: jest.fn(), get: jest.fn() };
        
        const binder = new LASFormElementBinder(mockCore, mockSettings);
        
        expect(binder).toBeInstanceOf(LASFormElementBinder);
        expect(binder.core).toBe(mockCore);
        expect(binder.settingsManager).toBe(mockSettings);
    });
});