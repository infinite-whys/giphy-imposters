// Import the Secret Manager client and instantiate it:
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

import * as config from './../config.json'


export async function createAndAccessSecret() {
    try {
        const client = new SecretManagerServiceClient();

        // Access the secret.
        const [accessResponse] = await client.accessSecretVersion({
            name: config.secretID,
        });

        const responsePayload = accessResponse.payload.data.toString();
        return responsePayload
    } catch (e) {
        console.error(e)
        throw('Please set environment variable GOOGLE_APPLICATION_CREDENTIALS')
    }

}

createAndAccessSecret() 