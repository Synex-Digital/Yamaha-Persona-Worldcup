require('dotenv').config({ path: '.env.local' });
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

async function testS3() {
  console.log('Testing AWS S3 Connection...');
  
  if (!process.env.S3_BUCKET_NAME) {
    console.error('❌ Error: S3_BUCKET_NAME is missing in .env.local');
    return;
  }

  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  const bucketName = process.env.S3_BUCKET_NAME;

  try {
    const testContent = 'This is a test file from the Yamaha AI Next.js backend.';
    const fileName = `test-upload-${Date.now()}.txt`;

    console.log(`Attempting to upload file: ${fileName} to bucket: ${bucketName}...`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: testContent,
      ContentType: 'text/plain',
      ACL: 'public-read'
    });

    await s3Client.send(command);

    const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    
    console.log('✅ Upload Successful!');
    console.log('You can view your test file at this URL:');
    console.log(publicUrl);

  } catch (error) {
    console.error('❌ AWS S3 Upload Failed!');
    console.error(error.message);
    if (error.message.includes('Access Denied')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check if the IAM user has the AmazonS3FullAccess policy attached.');
      console.log('2. Check if the S3 bucket is blocking public access (ACLs must be enabled).');
    }
  }
}

testS3();
