import formidable from 'formidable';
import fs from 'node:fs';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: false
  }
};

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY não configurada no backend.' });
  }

  try {
    const { files } = await parseForm(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) return res.status(400).json({ error: 'Envie um arquivo no campo file.' });
    if (file.size > MAX_SIZE_BYTES) return res.status(413).json({ error: 'Arquivo maior que 25 MB.' });

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(file.filepath),
      model: process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment']
    });

    return res.status(200).json({
      text: response.text || '',
      language: response.language || null,
      duration: response.duration || null,
      segments: (response.segments || []).map(segment => ({
        start: Number(segment.start || 0),
        end: Number(segment.end || 0),
        text: String(segment.text || '').trim()
      })).filter(segment => segment.text)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Falha ao transcrever.' });
  }
}

function parseForm(req) {
  const form = formidable({
    multiples: false,
    maxFileSize: MAX_SIZE_BYTES,
    keepExtensions: true
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
