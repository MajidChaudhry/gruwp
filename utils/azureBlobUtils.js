import containerClient from '../config/azureBlobConfig.js';

// Helper function to upload file to Azure Blob Storage
export const uploadToBlob = async (file) => {
  if (!file) return null;
  
  const blobName = `${Date.now()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype },
    });
    return blockBlobClient.url;
  } catch (error) {
    console.error('Error uploading file to blob storage:', error.message);
    throw new Error('Failed to upload file to blob storage');
  }
};

// Helper function to delete file from Azure Blob Storage
export const deleteFileFromBlob = async (blobUrl) => {
  if (!blobUrl) return;

  const blobName = blobUrl.split('/').pop();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  try {
    await blockBlobClient.deleteIfExists();
  } catch (error) {
    console.error('Error deleting file from blob storage:', error.message);
    throw new Error('Failed to delete file from blob storage');
  }
};
