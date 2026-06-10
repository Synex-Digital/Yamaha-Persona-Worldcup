import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface Session {
  id: string;
  username: string;
  role: 'admin' | 'superadmin';
  userAgent: string;
  ip: string;
  createdAt: string;
}

const SESSION_FILE_PATH = path.join(process.cwd(), 'scratch', 'sessions.json');

// Helper to ensure the directory exists and the file is initialized
async function ensureSessionFile() {
  const dir = path.dirname(SESSION_FILE_PATH);
  if (!fs.existsSync(dir)) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
  if (!fs.existsSync(SESSION_FILE_PATH)) {
    await fs.promises.writeFile(SESSION_FILE_PATH, JSON.stringify([]), 'utf8');
  }
}

// Read sessions from the JSON file
export async function getActiveSessions(): Promise<Session[]> {
  try {
    await ensureSessionFile();
    const data = await fs.promises.readFile(SESSION_FILE_PATH, 'utf8');
    if (!data.trim()) return [];
    
    let sessions: Session[] = [];
    try {
      sessions = JSON.parse(data) as Session[];
    } catch {
      // If parsing fails (e.g. malformed JSON), start fresh
      sessions = [];
    }
    
    // Clean up expired sessions (older than 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const validSessions = sessions.filter(s => {
      try {
        return new Date(s.createdAt) > sevenDaysAgo;
      } catch {
        return false;
      }
    });
    
    if (validSessions.length !== sessions.length) {
      await fs.promises.writeFile(SESSION_FILE_PATH, JSON.stringify(validSessions, null, 2), 'utf8');
    }
    
    return validSessions;
  } catch (err) {
    console.error('Failed to read sessions file:', err);
    return [];
  }
}

// Add a new session
export async function addSession(sessionData: Omit<Session, 'id' | 'createdAt'>): Promise<string> {
  const sessions = await getActiveSessions();
  const id = crypto.randomUUID();
  const newSession: Session = {
    id,
    ...sessionData,
    createdAt: new Date().toISOString()
  };
  
  sessions.push(newSession);
  
  try {
    await fs.promises.writeFile(SESSION_FILE_PATH, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save new session:', err);
  }
  
  return id;
}

// Validate a session
export async function validateSession(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const sessions = await getActiveSessions();
  return sessions.some(s => s.id === sessionId);
}

// Revoke a specific session
export async function revokeSession(sessionId: string): Promise<void> {
  const sessions = await getActiveSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  
  try {
    await fs.promises.writeFile(SESSION_FILE_PATH, JSON.stringify(filtered, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to revoke session:', err);
  }
}

// Revoke all sessions
export async function revokeAllSessions(): Promise<void> {
  try {
    await ensureSessionFile();
    await fs.promises.writeFile(SESSION_FILE_PATH, JSON.stringify([]), 'utf8');
  } catch (err) {
    console.error('Failed to revoke all sessions:', err);
  }
}
