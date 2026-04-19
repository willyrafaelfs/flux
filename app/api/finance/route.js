import { google } from 'googleapis';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

const getDriveClient = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) return null;

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
};

async function getOrCreateFolderId(drive, folderName = 'Flux_Receipts') {
  const response = await drive.files.list({
    q: `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });
  if (response.data.files.length > 0) return response.data.files[0].id;

  const folder = await drive.files.create({
    resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  return folder.data.id;
}

async function getOrCreateFileId(drive) {
  try {
    const response = await drive.files.list({
      q: "name = 'finance_data.json' and trashed = false",
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.data.files;
    if (files && files.length > 0) return files[0].id;

    const fileMetadata = { name: 'finance_data.json', mimeType: 'application/json' };
    const media = { mimeType: 'application/json', body: JSON.stringify([], null, 2) };
    const file = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
    return file.data.id;
  } catch (error) {
    console.error("Drive error:", error.message);
    return null;
  }
}

async function fetchDriveData(drive, fileId) {
  try {
    const response = await drive.files.get({ fileId, alt: 'media' });
    if (!response.data) return [];
    if (typeof response.data === 'string') return JSON.parse(response.data);
    return response.data;
  } catch (error) {
    return [];
  }
}

export async function GET() {
  const drive = await getDriveClient();
  if (!drive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fileId = await getOrCreateFileId(drive);
  if (!fileId) return NextResponse.json({ error: "Drive Access Fail" }, { status: 500 });
  const data = await fetchDriveData(drive, fileId);
  return NextResponse.json({ data });
}

export async function POST(request) {
  const drive = await getDriveClient();
  if (!drive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const contentType = request.headers.get("content-type") || "";
    let bodyData = {};
    let imageUrl = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      bodyData = JSON.parse(formData.get("data"));
      const imageFile = formData.get("file");

      if (imageFile) {
        const folderId = await getOrCreateFolderId(drive);
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const uploadResponse = await drive.files.create({
          requestBody: {
            name: `receipt_${Date.now()}.jpg`,
            parents: [folderId],
          },
          media: {
            mimeType: imageFile.type,
            body: stream,
          },
          fields: 'id, webViewLink',
        });
        imageUrl = uploadResponse.data.webViewLink;
      }
    } else {
      bodyData = await request.json();
    }

    const fileId = await getOrCreateFileId(drive);
    const data = await fetchDriveData(drive, fileId);

    const newEntry = { 
      id: Date.now().toString(), 
      createdAt: new Date().toISOString(), 
      ...bodyData,
      imageUrl 
    };
    
    data.push(newEntry);
    await drive.files.update({
      fileId,
      media: { mimeType: 'application/json', body: JSON.stringify(data, null, 2) }
    });

    return NextResponse.json({ message: "Success", entry: newEntry });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const drive = await getDriveClient();
  if (!drive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const fileId = await getOrCreateFileId(drive);
    const data = await fetchDriveData(drive, fileId);
    const index = data.findIndex(i => i.id === id);
    if (index === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    data[index] = { ...data[index], ...updates };
    await drive.files.update({
      fileId,
      media: { mimeType: 'application/json', body: JSON.stringify(data, null, 2) }
    });
    return NextResponse.json({ message: "Updated" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const drive = await getDriveClient();
  if (!drive) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    const fileId = await getOrCreateFileId(drive);
    const data = await fetchDriveData(drive, fileId);
    const newData = data.filter(i => i.id !== id);
    await drive.files.update({
      fileId,
      media: { mimeType: 'application/json', body: JSON.stringify(newData, null, 2) }
    });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
