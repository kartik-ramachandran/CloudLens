import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SendIcon from '@mui/icons-material/Send';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import {
  ChatMessage,
  ChatSession,
  deleteChatSession,
  getChatMessages,
  getChatSessions,
  renameChatSession,
  sendChatMessage,
} from '../services/api';

type Message = ChatMessage & { attachment?: string };

const suggestedPrompts = [
  'Review my Azure posture for SOC 2 readiness.',
  'What should I investigate first to reduce cloud risk?',
  'Draft a remediation plan for public network exposure.',
  'Explain the FinOps actions with the fastest payback.',
];

const chatShellSx = {
  height: { xs: 'calc(100vh - 150px)', md: 'calc(100vh - 158px)' },
  minHeight: 620,
  overflow: 'hidden',
  borderRadius: 3,
  border: '1px solid rgba(15,23,42,0.10)',
  bgcolor: 'rgba(255,255,255,0.92)',
  boxShadow: '0 28px 90px rgba(31,51,86,0.13)',
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' },
} as const;

const CloudAssistantChat: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const canSend = (input.trim().length > 0 || attachedFile) && !streaming;
  const activeTitle = currentSessionId
    ? sessions.find(s => s.sessionId === currentSessionId)?.title ?? 'Current chat'
    : 'New cloud chat';

  const statusLabel = useMemo(() => {
    if (streaming) return 'CloudLens is drafting a response';
    if (attachedFile) return `${attachedFile.name} attached`;
    if (messages.length > 0) return 'Ready for your next question';
    return 'Ask about cloud cost, security, compliance, or remediation';
  }, [attachedFile, messages.length, streaming]);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function loadSessions() {
    setLoadingSessions(true);
    try {
      setSessions(await getChatSessions());
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Unable to load chat sessions.');
    } finally {
      setLoadingSessions(false);
    }
  }

  async function loadSession(sessionId: string) {
    setCurrentSessionId(sessionId);
    setError(null);
    try {
      const data = await getChatMessages(sessionId);
      setMessages(data.map(m => {
        const match = m.content.match(/\n\nAttached file: (.+)$/);
        return {
          ...m,
          content: match ? m.content.replace(/\n\nAttached file: .+$/, '') : m.content,
          attachment: match ? match[1] : undefined,
        };
      }));
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Unable to load this chat.');
    }
  }

  function newChat() {
    setCurrentSessionId(null);
    setMessages([]);
    setInput('');
    setAttachedFile(null);
    setError(null);
  }

  async function saveRename(sessionId: string) {
    const title = renameTitle.trim();
    setRenamingId(null);
    if (!title) return;
    await renameChatSession(sessionId, title);
    setSessions(prev => prev.map(s => s.sessionId === sessionId ? { ...s, title } : s));
  }

  async function removeSession(sessionId: string) {
    await deleteChatSession(sessionId);
    if (currentSessionId === sessionId) newChat();
    await loadSessions();
  }

  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if ((!text && !attachedFile) || streaming) return;

    const fileToSend = attachedFile;
    const userMessage: Message = {
      role: 'user',
      content: text,
      attachment: fileToSend?.name,
      createdAt: new Date().toISOString(),
    };

    const assistantIndex = messages.length + 1;
    const nextMessages: Message[] = [
      ...messages,
      userMessage,
      { role: 'assistant', content: '', createdAt: new Date().toISOString() },
    ];
    setMessages(nextMessages);
    setInput('');
    setAttachedFile(null);
    setStreaming(true);
    setError(null);

    const history = messages.slice(-16).map(m => ({ role: m.role, content: m.content }));
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await sendChatMessage({
        sessionId: currentSessionId ?? undefined,
        message: text || (fileToSend ? `Please analyze the attached file: ${fileToSend.name}` : ''),
        history,
        file: fileToSend,
        signal: controller.signal,
      });

      const newSessionId = response.headers.get('X-Session-Id');
      if (newSessionId && !currentSessionId) {
        setCurrentSessionId(newSessionId);
        loadSessions();
      }

      if (!response.ok || !response.body) {
        throw new Error('The assistant could not start a response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;
          const parsed = JSON.parse(data);
          if (parsed.content) {
            setMessages(prev => prev.map((msg, idx) =>
              idx === assistantIndex ? { ...msg, content: msg.content + parsed.content } : msg
            ));
          }
          if (parsed.error) {
            setMessages(prev => prev.map((msg, idx) =>
              idx === assistantIndex ? { ...msg, content: `${msg.content}\n\n${parsed.error}`.trim() } : msg
            ));
          }
        }
      }
    } catch (e: any) {
      const message = e?.name === 'AbortError' ? '[stopped]' : e?.message ?? 'Connection error. Please try again.';
      setMessages(prev => prev.map((msg, idx) =>
        idx === assistantIndex ? { ...msg, content: msg.content || message } : msg
      ));
    } finally {
      setStreaming(false);
      abortRef.current = null;
      loadSessions();
    }
  }

  return (
    <Box sx={chatShellSx}>
      <Box sx={{ display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', borderRight: '1px solid rgba(15,23,42,0.08)', bgcolor: 'rgba(248,251,255,0.86)', minWidth: 0 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
          <Typography variant="overline" sx={{ letterSpacing: 2, fontWeight: 900, color: '#0e7490', fontSize: '0.64rem' }}>
            Assistant
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.6 }}>
            Chat workspace
          </Typography>
          <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={newChat} sx={{ borderColor: '#67e8f9', bgcolor: '#ecfeff', color: '#0e7490' }}>
            New chat
          </Button>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, mb: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase' }}>
              Recent
            </Typography>
            <Chip size="small" label={sessions.length} />
          </Box>

          {loadingSessions && <CircularProgress size={22} sx={{ m: 2 }} />}
          {!loadingSessions && sessions.length === 0 && (
            <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderStyle: 'dashed', color: 'text.secondary' }}>
              No chats yet
            </Paper>
          )}

          {sessions.map(session => (
            <Box
              key={session.sessionId}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 0.5,
                p: 1,
                mb: 0.5,
                borderRadius: 2,
                bgcolor: currentSessionId === session.sessionId ? '#cffafe' : 'transparent',
                '&:hover': { bgcolor: currentSessionId === session.sessionId ? '#cffafe' : 'white' },
              }}
            >
              {renamingId === session.sessionId ? (
                <TextField
                  value={renameTitle}
                  onChange={e => setRenameTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveRename(session.sessionId);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onBlur={() => saveRename(session.sessionId)}
                  autoFocus
                  size="small"
                  sx={{ flex: 1 }}
                />
              ) : (
                <Box component="button" onClick={() => loadSession(session.sessionId)} sx={{ flex: 1, minWidth: 0, border: 0, bgcolor: 'transparent', textAlign: 'left', cursor: 'pointer', p: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {session.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {session.messageCount} messages · {formatRelativeTime(session.updatedAt)}
                  </Typography>
                </Box>
              )}
              <Tooltip title="Rename">
                <IconButton size="small" onClick={() => { setRenamingId(session.sessionId); setRenameTitle(session.title); }}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => removeSession(session.sessionId)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>

        <Box sx={{ p: 2, borderTop: '1px solid rgba(15,23,42,0.08)' }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderColor: '#a5f3fc', bgcolor: '#ecfeff' }}>
            <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: 1.8, color: '#0e7490' }}>
              CLOUDLENS READY
            </Typography>
            <Typography variant="caption" display="block" sx={{ color: 'text.primary', mt: 0.5 }}>
              Ask questions with your AI settings, or attach text-based context files.
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.8, borderBottom: '1px solid rgba(15,23,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' }}>
              <ChatBubbleOutlineIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {statusLabel}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`${messages.length} messages`} size="small" />
            <Button size="small" startIcon={<AddIcon />} onClick={newChat} sx={{ display: { xs: 'inline-flex', lg: 'none' } }}>
              New
            </Button>
          </Stack>
        </Box>

        <Box ref={messagesRef} sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, py: 3, bgcolor: 'white' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {messages.length === 0 ? (
            <Box sx={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <Box sx={{ width: '100%', maxWidth: 900 }}>
                <Box sx={{ mx: 'auto', mb: 2, width: 66, height: 66, display: 'grid', placeItems: 'center', borderRadius: 3, bgcolor: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc', boxShadow: '0 18px 42px rgba(8,145,178,0.12)' }}>
                  <AutoAwesomeIcon sx={{ fontSize: 32 }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 950 }}>
                  CloudLens Assistant
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Ask about cloud posture, cost, SOC 2 controls, vulnerabilities, network exposure, or remediation.
                </Typography>
                <Box sx={{ mt: 3, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
                  {suggestedPrompts.map(prompt => (
                    <Button
                      key={prompt}
                      variant="outlined"
                      onClick={() => handleSend(prompt)}
                      sx={{ justifyContent: 'flex-start', textAlign: 'left', py: 1.4, px: 2, borderColor: 'rgba(15,23,42,0.14)', color: 'text.primary', bgcolor: 'white' }}
                    >
                      {prompt}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          ) : (
            <Stack spacing={2.2} sx={{ maxWidth: 1100, mx: 'auto' }}>
              {messages.map((msg, index) => (
                <Box key={`${msg.createdAt}-${index}`} sx={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 1.2 }}>
                  {msg.role === 'assistant' && (
                    <Box sx={{ mt: 0.5, width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: '#cffafe', color: '#0e7490', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
                      AI
                    </Box>
                  )}
                  <Box sx={{ maxWidth: msg.role === 'user' ? { xs: '88%', md: '66%' } : { xs: '94%', md: '80%' } }}>
                    {msg.attachment && (
                      <Chip size="small" icon={<AttachFileIcon />} label={msg.attachment} sx={{ mb: 0.8, bgcolor: '#ecfeff', color: '#0e7490', fontWeight: 800 }} />
                    )}
                    {msg.content ? (
                      <Paper
                        elevation={0}
                        sx={{
                          px: msg.role === 'user' ? 2 : 2.4,
                          py: 1.6,
                          borderRadius: 3,
                          borderTopRightRadius: msg.role === 'user' ? 6 : 24,
                          borderTopLeftRadius: msg.role === 'assistant' ? 6 : 24,
                          bgcolor: msg.role === 'user' ? '#0ea5e9' : '#f8fafc',
                          color: msg.role === 'user' ? 'white' : 'text.primary',
                          border: msg.role === 'assistant' ? '1px solid rgba(15,23,42,0.10)' : 'none',
                          boxShadow: msg.role === 'user' ? '0 14px 34px rgba(14,165,233,0.18)' : '0 14px 34px rgba(15,23,42,0.06)',
                        }}
                      >
                        {msg.role === 'assistant' ? renderMarkdown(msg.content) : <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{msg.content}</Typography>}
                      </Paper>
                    ) : (
                      <Paper variant="outlined" sx={{ px: 2, py: 1.4, borderRadius: 3, display: 'flex', gap: 0.8, alignItems: 'center' }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>Thinking</Typography>
                      </Paper>
                    )}
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {attachedFile && (
          <Box sx={{ mx: 2, mb: 1, px: 1.5, py: 1, borderRadius: 2, bgcolor: '#ecfeff', border: '1px solid #a5f3fc', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachFileIcon fontSize="small" sx={{ color: '#0891b2' }} />
            <Typography variant="body2" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 700 }}>{attachedFile.name}</Typography>
            <IconButton size="small" onClick={() => setAttachedFile(null)}><CloseIcon fontSize="small" /></IconButton>
          </Box>
        )}

        <Box sx={{ borderTop: '1px solid rgba(15,23,42,0.08)', p: 2, bgcolor: 'rgba(248,251,255,0.92)' }}>
          <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', alignItems: 'flex-end', gap: 1, p: 1, borderRadius: 3, border: '1px solid rgba(15,23,42,0.12)', bgcolor: 'white', boxShadow: '0 12px 34px rgba(31,51,86,0.08)' }}>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={event => {
                setAttachedFile(event.target.files?.[0] ?? null);
                event.currentTarget.value = '';
              }}
            />
            <Tooltip title="Attach file">
              <IconButton onClick={() => fileInputRef.current?.click()} aria-label="Attach file">
                <AttachFileIcon />
              </IconButton>
            </Tooltip>
            <TextField
              fullWidth
              multiline
              maxRows={5}
              placeholder="Message CloudLens Assistant..."
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              variant="standard"
              InputProps={{ disableUnderline: true }}
            />
            {streaming ? (
              <Tooltip title="Stop response">
                <IconButton color="error" onClick={() => abortRef.current?.abort()} aria-label="Stop response">
                  <StopCircleOutlinedIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <IconButton color="primary" disabled={!canSend} onClick={() => handleSend()} aria-label="Send message" sx={{ bgcolor: canSend ? '#e0f2fe' : 'transparent' }}>
                <SendIcon />
              </IconButton>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 1100, mx: 'auto', mt: 0.8 }}>
            Enter sends, Shift+Enter adds a line
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

function renderMarkdown(text: string) {
  const blocks = text.split(/\n{2,}/);
  return (
    <Box sx={{
      '& p': { m: '0.6rem 0', lineHeight: 1.75 },
      '& p:first-of-type': { mt: 0 },
      '& p:last-child': { mb: 0 },
      '& code': { bgcolor: '#e2e8f0', borderRadius: 1, px: 0.5, py: 0.15, fontFamily: 'monospace', fontSize: '0.82em' },
    }}>
      {blocks.map((block, index) => {
        const lines = block.split('\n').filter(Boolean);
        if (lines.every(line => /^[-*]\s+/.test(line.trim()))) {
          return (
            <Box component="ul" key={index} sx={{ my: 1, pl: 2.5 }}>
              {lines.map(line => <li key={line}><Typography component="span" variant="body2" sx={{ lineHeight: 1.7 }}>{inlineFormat(line.replace(/^[-*]\s+/, ''))}</Typography></li>)}
            </Box>
          );
        }
        if (lines.every(line => /^\d+\.\s+/.test(line.trim()))) {
          return (
            <Box component="ol" key={index} sx={{ my: 1, pl: 2.5 }}>
              {lines.map(line => <li key={line}><Typography component="span" variant="body2" sx={{ lineHeight: 1.7 }}>{inlineFormat(line.replace(/^\d+\.\s+/, ''))}</Typography></li>)}
            </Box>
          );
        }
        const heading = block.match(/^#{1,3}\s+(.+)/);
        if (heading) {
          return <Typography key={index} variant="subtitle1" sx={{ mt: index === 0 ? 0 : 1.8, mb: 0.8, fontWeight: 900 }}>{inlineFormat(heading[1])}</Typography>;
        }
        return <Typography key={index} variant="body2" component="p" sx={{ whiteSpace: 'pre-wrap' }}>{inlineFormat(block)}</Typography>;
      })}
    </Box>
  );
}

function inlineFormat(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function formatRelativeTime(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default CloudAssistantChat;
