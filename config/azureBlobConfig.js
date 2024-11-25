import { BlobServiceClient } from "@azure/storage-blob";
import 'dotenv/config';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);

const ensureContainerExists = async () => {
  const exists = await containerClient.exists();
  if (!exists) {
    console.log(`Container "${process.env.AZURE_STORAGE_CONTAINER_NAME}" does not exist. Creating it...`);
    await containerClient.create();
    console.log("Container created successfully.");
  }
};

// Ensure the container exists when the module is loaded
await ensureContainerExists();

export default containerClient;
