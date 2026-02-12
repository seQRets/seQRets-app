
/// <reference lib="webworker" />
import { createShares, restoreSecret, decryptInstructions, encryptInstructions, encryptVault, decryptVault } from './crypto';

self.addEventListener('message', async (event: MessageEvent<{ type: string, payload: any }>) => {
    const { type, payload } = event.data;

    try {
        if (type === 'createShares') {
            const result = await createShares(payload);
            self.postMessage({ type: 'createSharesSuccess', payload: result });
        } else if (type === 'restoreSecret') {
            const result = await restoreSecret(payload);
            self.postMessage({ type: 'restoreSecretSuccess', payload: result });
        } else if (type === 'decryptInstructions') {
            const result = await decryptInstructions(payload);
            self.postMessage({ type: 'decryptInstructionsSuccess', payload: result });
        } else if (type === 'encryptInstructions') {
            const result = await encryptInstructions(payload.instructions, payload.password, payload.firstShare, payload.keyfile);
            self.postMessage({ type: 'encryptInstructionsSuccess', payload: result });
        } else if (type === 'encryptVault') {
            const result = await encryptVault(payload.jsonString, payload.password);
            self.postMessage({ type: 'encryptVaultSuccess', payload: result });
        } else if (type === 'decryptVault') {
            const result = await decryptVault(payload.salt, payload.data, payload.password);
            self.postMessage({ type: 'decryptVaultSuccess', payload: result });
        }
    } catch (e: any) {
        // We send back a simplified error object because the full Error object cannot be cloned.
        const error = { message: e.message, name: e.name, stack: e.stack };
        if (type === 'createShares') {
            self.postMessage({ type: 'createSharesError', payload: error });
        } else if (type === 'restoreSecret') {
            self.postMessage({ type: 'restoreSecretError', payload: error });
        } else if (type === 'decryptInstructions') {
            self.postMessage({ type: 'decryptInstructionsError', payload: error });
        } else if (type === 'encryptInstructions') {
            self.postMessage({ type: 'encryptInstructionsError', payload: error });
        } else if (type === 'encryptVault') {
            self.postMessage({ type: 'encryptVaultError', payload: error });
        } else if (type === 'decryptVault') {
            self.postMessage({ type: 'decryptVaultError', payload: error });
        }
    }
});
