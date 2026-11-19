import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowBigUp,
  CornerDownRight,
  Lightbulb,
  MessageSquare,
  Plus,
  Send,
  Users,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  BrainstormIdea,
  DiscussionMessage,
  RoomParticipant,
  TopicRoom,
} from '../types/marketplace.ts';
import { formatDateTime } from '../utils/format.ts';

interface CommunityWorkspaceProps {
  topics: TopicRoom[];
  messages: DiscussionMessage[];
  ideas: BrainstormIdea[];
  createTopicModalOpen: boolean;
  onCloseCreateTopicModal: () => void;
  onOpenCreateTopicModal: () => void;
  onCreateTopic: (payload: {
    title: string;
    category: string;
    description: string;
    createdBy: string;
  }) => Promise<void>;
  onPostMessage: (payload: {
    topicId: string;
    authorName: string;
    authorRole: string;
    body: string;
    replyToId?: string;
    replyToAuthor?: string;
  }) => Promise<void>;
  onCreateIdea: (payload: {
    topicId: string;
    title: string;
    summary: string;
    tag: 'Workflow' | 'Pricing' | 'Feature' | 'Growth';
    authorName: string;
    authorRole: string;
  }) => Promise<void>;
  onVoteIdea: (ideaId: string, voterName: string) => Promise<void>;
  onRealtimeEvent: (event: { type: string; payload: unknown }) => void;
}

const PROFILE_STORAGE_KEY = 'freelance_hub_community_profile';

export const CommunityWorkspace: React.FC<CommunityWorkspaceProps> = ({
  topics,
  messages,
  ideas,
  createTopicModalOpen,
  onCloseCreateTopicModal,
  onOpenCreateTopicModal,
  onCreateTopic,
  onPostMessage,
  onCreateIdea,
  onVoteIdea,
  onRealtimeEvent,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string>(
    topics[0]?.id || '',
  );
  const [memberName, setMemberName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) return (JSON.parse(saved) as { name?: string }).name || 'Amina Wanjiku';
    } catch {
      // ignore
    }
    return 'Amina Wanjiku';
  });
  const [memberRole, setMemberRole] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) return (JSON.parse(saved) as { role?: string }).role || 'Freelancer';
    } catch {
      // ignore
    }
    return 'Freelancer';
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(memberName);
  const [draftRole, setDraftRole] = useState(memberRole);

  const [wsConnected, setWsConnected] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const onRealtimeRef = useRef(onRealtimeEvent);
  onRealtimeRef.current = onRealtimeEvent;

  // Discussion input state
  const [messageInput, setMessageInput] = useState('');
  const [replyTarget, setReplyTarget] = useState<DiscussionMessage | null>(null);
  const [sendingMsg, setSendingMsg] = useState(false);

  // Brainstorm input & filter state
  const [ideaSort, setIdeaSort] = useState<'votes' | 'newest'>('votes');
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaSummary, setIdeaSummary] = useState('');
  const [ideaTag, setIdeaTag] = useState<
    'Workflow' | 'Pricing' | 'Feature' | 'Growth'
  >('Workflow');
  const [savingIdea, setSavingIdea] = useState(false);

  // Mobile view switch inside topic
  const [mobilePane, setMobilePane] = useState<'discussion' | 'brainstorm'>(
    'discussion',
  );

  // New Topic Modal state
  const [topicTitle, setTopicTitle] = useState('');
  const [topicCategory, setTopicCategory] = useState('Payments & Pricing');
  const [topicDesc, setTopicDesc] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  useEffect(() => {
    if (!topics.some((t) => t.id === selectedTopicId) && topics.length > 0) {
      setSelectedTopicId(topics[0].id);
    }
  }, [topics, selectedTopicId]);

  useEffect(() => {
    let active = true;
    let reconnectTimer: number | undefined;
    let attempt = 0;

    const connect = () => {
      if (!active) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = socket;

      socket.onopen = () => {
        if (!active) return;
        attempt = 0;
        setWsConnected(true);
        socket.send(
          JSON.stringify({
            type: 'room:join',
            payload: {
              name: memberName,
              role: memberRole,
              topicId: selectedTopicId,
            },
          }),
        );
      };

      socket.onmessage = (evt) => {
        try {
          const data = JSON.parse(String(evt.data)) as {
            type: string;
            payload: unknown;
          };
          if (data.type === 'presence:updated') {
            setParticipants((data.payload as RoomParticipant[]) || []);
          } else {
            onRealtimeRef.current(data);
          }
        } catch {
          // ignore malformed messages
        }
      };

      socket.onclose = () => {
        if (!active) return;
        setWsConnected(false);
        const delay = Math.min(8000, 1000 * Math.pow(1.6, attempt));
        attempt += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, []);

  // Announce topic or profile changes over active socket
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'room:join',
          payload: {
            name: memberName,
            role: memberRole,
            topicId: selectedTopicId,
          },
        }),
      );
    }
  }, [memberName, memberRole, selectedTopicId]);

  const activeTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) || topics[0],
    [topics, selectedTopicId],
  );

  const roomMessages = useMemo(
    () => messages.filter((m) => m.topicId === activeTopic?.id),
    [messages, activeTopic],
  );

  const roomIdeas = useMemo(() => {
    const filtered = ideas.filter((i) => i.topicId === activeTopic?.id);
    if (ideaSort === 'votes') {
      return [...filtered].sort((a, b) => b.votes - a.votes);
    }
    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [ideas, activeTopic, ideaSort]);

  const roomParticipants = useMemo(
    () => participants.filter((p) => p.topicId === activeTopic?.id),
    [participants, activeTopic],
  );

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = draftName.trim() || 'Guest Member';
    const cleanRole = draftRole.trim() || 'Freelancer';
    setMemberName(cleanName);
    setMemberRole(cleanRole);
    try {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ name: cleanName, role: cleanRole }),
      );
    } catch {
      // ignore storage failure
    }
    setEditingProfile(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic || !messageInput.trim()) return;
    setSendingMsg(true);
    try {
      await onPostMessage({
        topicId: activeTopic.id,
        authorName: memberName,
        authorRole: memberRole,
        body: messageInput.trim(),
        replyToId: replyTarget?.id,
        replyToAuthor: replyTarget?.authorName,
      });
      setMessageInput('');
      setReplyTarget(null);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleCreateIdeaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTopic || !ideaTitle.trim()) return;
    setSavingIdea(true);
    try {
      await onCreateIdea({
        topicId: activeTopic.id,
        title: ideaTitle.trim(),
        summary: ideaSummary.trim(),
        tag: ideaTag,
        authorName: memberName,
        authorRole: memberRole,
      });
      setIdeaTitle('');
      setIdeaSummary('');
      setShowIdeaForm(false);
    } finally {
      setSavingIdea(false);
    }
  };

  const handleCreateTopicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;
    setCreatingTopic(true);
    try {
      await onCreateTopic({
        title: topicTitle.trim(),
        category: topicCategory,
        description: topicDesc.trim(),
        createdBy: memberName,
      });
      setTopicTitle('');
      setTopicDesc('');
      onCloseCreateTopicModal();
    } finally {
      setCreatingTopic(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Member Join / Identity Bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        {editingProfile ? (
          <form
            onSubmit={handleSaveIdentity}
            className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Your display name"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
            <select
              value={draftRole}
              onChange={(e) => setDraftRole(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              <option value="Freelancer">Freelancer</option>
              <option value="Client">Client</option>
              <option value="Product Designer">Product Designer</option>
              <option value="Full-Stack Engineer">Full-Stack Engineer</option>
              <option value="Fintech Advisor">Fintech Advisor</option>
            </select>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 whitespace-nowrap"
              >
                Join as {draftName || 'Member'}
              </button>
              <button
                type="button"
                onClick={() => setEditingProfile(false)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <div className="text-xs text-slate-500">Joined Community As</div>
              <div className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span>{memberName}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-normal text-slate-600">{memberRole}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDraftName(memberName);
                setDraftRole(memberRole);
                setEditingProfile(true);
              }}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              Switch Name / Role
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-600 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            {wsConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            )}
            <span>{wsConnected ? 'Live Sync Connected' : 'Reconnecting'}</span>
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {Math.max(1, roomParticipants.length)} in room
          </span>
        </div>
      </div>

      {/* Main Layout: Topic Directory + Room Split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Topic Rooms List (3 cols on lg) */}
        <aside className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Topic Rooms ({topics.length})
            </h2>
            <button
              type="button"
              onClick={onOpenCreateTopicModal}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              New Topic
            </button>
          </div>

          <div className="space-y-2">
            {topics.map((topic) => {
              const isSelected = activeTopic?.id === topic.id;
              const msgCount = messages.filter(
                (m) => m.topicId === topic.id,
              ).length;
              const ideaCount = ideas.filter(
                (i) => i.topicId === topic.id,
              ).length;

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-600 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-medium text-emerald-700">
                    {topic.category}
                  </div>
                  <div className="mt-1 font-display text-sm font-semibold text-slate-900">
                    {topic.title}
                  </div>
                  <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-slate-500 tabular-nums">
                    <span>{msgCount} msgs</span>
                    <span aria-hidden="true">·</span>
                    <span>{ideaCount} ideas</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Active Room: Discussion & Brainstorming (9 cols on lg) */}
        <div className="space-y-4 lg:col-span-9">
          {activeTopic ? (
            <>
              {/* Room Header */}
              <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-emerald-700">
                        {activeTopic.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Started by {activeTopic.createdBy}</span>
                    </div>
                    <h2 className="mt-1 font-display text-lg font-semibold text-slate-900">
                      {activeTopic.title}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {activeTopic.description}
                    </p>
                  </div>
                </div>

                {roomParticipants.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">
                      Active in room:{' '}
                    </span>
                    {roomParticipants
                      .map((p) => `${p.name} (${p.role})`)
                      .join(' · ')}
                  </div>
                )}
              </div>

              {/* Mobile Pane Switcher */}
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobilePane('discussion')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    mobilePane === 'discussion'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Discussion ({roomMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMobilePane('brainstorm')}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                    mobilePane === 'brainstorm'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600'
                  }`}
                >
                  Brainstorm Board ({roomIdeas.length})
                </button>
              </div>

              {/* 2-Column Collaborative Split on Desktop */}
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                {/* Live Discussion Thread (7 cols) */}
                <section
                  className={`flex flex-col rounded-lg border border-slate-200 bg-white xl:col-span-7 ${
                    mobilePane === 'discussion' ? 'flex' : 'hidden xl:flex'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-emerald-600" />
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Live Discussion
                      </h3>
                    </div>
                    <span className="font-mono text-xs text-slate-500 tabular-nums">
                      {roomMessages.length} messages
                    </span>
                  </div>

                  <div className="max-h-[440px] flex-1 space-y-4 overflow-y-auto p-5">
                    {roomMessages.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500">
                        No messages in this room yet. Start the conversation
                        below.
                      </div>
                    ) : (
                      roomMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="border-b border-slate-100 pb-3.5 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-900">
                                {msg.authorName}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-slate-500">
                                {msg.authorRole}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                                {formatDateTime(msg.createdAt)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyTarget(msg)}
                              className="text-[11px] font-medium text-slate-500 hover:text-emerald-700 whitespace-nowrap"
                            >
                              Reply
                            </button>
                          </div>

                          {msg.replyToAuthor && (
                            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                              <CornerDownRight className="h-3 w-3" />
                              <span>Replying to {msg.replyToAuthor}</span>
                            </div>
                          )}

                          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                            {msg.body}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    className="border-t border-slate-200 p-4 space-y-2"
                  >
                    {replyTarget && (
                      <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        <span>
                          Replying to <strong>{replyTarget.authorName}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setReplyTarget(null)}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder={`Message #${activeTopic.category}...`}
                        className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={sendingMsg || !messageInput.trim()}
                        className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Send
                      </button>
                    </div>
                  </form>
                </section>

                {/* Brainstorming Ideas Board (5 cols) */}
                <section
                  className={`flex flex-col rounded-lg border border-slate-200 bg-white xl:col-span-5 ${
                    mobilePane === 'brainstorm' ? 'flex' : 'hidden xl:flex'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-600" />
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Brainstorm Board
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        aria-label="Sort brainstorm ideas"
                        value={ideaSort}
                        onChange={(e) =>
                          setIdeaSort(e.target.value as 'votes' | 'newest')
                        }
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
                      >
                        <option value="votes">Top Voted</option>
                        <option value="newest">Newest</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowIdeaForm((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <Plus className="h-3 w-3" />
                        Idea
                      </button>
                    </div>
                  </div>

                  {showIdeaForm && (
                    <form
                      onSubmit={handleCreateIdeaSubmit}
                      className="space-y-3 border-b border-slate-200 bg-slate-50 p-4"
                    >
                      <input
                        type="text"
                        value={ideaTitle}
                        onChange={(e) => setIdeaTitle(e.target.value)}
                        placeholder="Idea title (e.g., Milestone checklist template)"
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                      <textarea
                        rows={2}
                        value={ideaSummary}
                        onChange={(e) => setIdeaSummary(e.target.value)}
                        placeholder="Brief rationale or workflow suggestion..."
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-none"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={ideaTag}
                          onChange={(e) =>
                            setIdeaTag(
                              e.target.value as
                                | 'Workflow'
                                | 'Pricing'
                                | 'Feature'
                                | 'Growth',
                            )
                          }
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
                        >
                          <option value="Workflow">Workflow</option>
                          <option value="Pricing">Pricing</option>
                          <option value="Feature">Feature</option>
                          <option value="Growth">Growth</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowIdeaForm(false)}
                            className="text-xs text-slate-500 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingIdea || !ideaTitle.trim()}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Post Idea
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  <div className="max-h-[440px] flex-1 divide-y divide-slate-200 overflow-y-auto">
                    {roomIdeas.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        No brainstorm ideas posted in this topic yet. Click +
                        Idea to propose one.
                      </div>
                    ) : (
                      roomIdeas.map((idea) => {
                        const hasVoted = idea.votedBy.includes(memberName);
                        return (
                          <div key={idea.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span className="font-medium text-slate-700">
                                    {idea.tag}
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>{idea.authorName}</span>
                                </div>
                                <h4 className="mt-0.5 text-sm font-semibold text-slate-900">
                                  {idea.title}
                                </h4>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                  {idea.summary}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => void onVoteIdea(idea.id, memberName)}
                                className={`flex flex-col items-center rounded-md border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors shrink-0 ${
                                  hasVoted
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                }`}
                                aria-label={`Upvote ${idea.title}`}
                              >
                                <ArrowBigUp className="h-3.5 w-3.5" />
                                <span className="font-semibold">
                                  {idea.votes}
                                </span>
                              </button>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setMessageInput(
                                    `Thoughts on "${idea.title}": `,
                                  );
                                  setMobilePane('discussion');
                                }}
                                className="text-[11px] font-medium text-emerald-700 hover:underline"
                              >
                                Discuss in Thread
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              Create your first topic room to start discussing and
              brainstorming.
            </div>
          )}
        </div>
      </div>

      {/* Create Topic Room Modal */}
      {createTopicModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-topic-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2
                id="create-topic-title"
                className="font-display text-base font-semibold text-slate-900"
              >
                Start a Discussion & Brainstorm Room
              </h2>
              <button
                type="button"
                onClick={onCloseCreateTopicModal}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close new topic modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTopicSubmit} className="space-y-4 p-6">
              <div>
                <label
                  htmlFor="topic-title-input"
                  className="block text-xs font-medium text-slate-700"
                >
                  Topic Title
                </label>
                <input
                  id="topic-title-input"
                  type="text"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g., Retainer Contracts & Weekly M-Pesa Billing"
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="topic-cat-select"
                  className="block text-xs font-medium text-slate-700"
                >
                  Category
                </label>
                <select
                  id="topic-cat-select"
                  value={topicCategory}
                  onChange={(e) => setTopicCategory(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="Payments & Pricing">Payments & Pricing</option>
                  <option value="Design & Craft">Design & Craft</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Growth & Proposals">Growth & Proposals</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="topic-desc-input"
                  className="block text-xs font-medium text-slate-700"
                >
                  Prompt / Goal for Participants
                </label>
                <textarea
                  id="topic-desc-input"
                  rows={3}
                  value={topicDesc}
                  onChange={(e) => setTopicDesc(e.target.value)}
                  placeholder="What should freelancers and clients brainstorm in this room?"
                  className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={onCloseCreateTopicModal}
                  className="rounded-md border border-slate-200 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTopic || !topicTitle.trim()}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {creatingTopic ? 'Creating...' : 'Create Topic Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
