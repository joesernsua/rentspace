import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FiMessageCircle, FiSend } from "react-icons/fi";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  getConversationMessages,
  getUserConversations,
  sendConversationMessage,
} from "../services/chatService";
import type { Conversation, ChatMessage } from "../types/Chat";

function formatTime(message: ChatMessage) {
  if (!message.createdAt) return "";
  return message.createdAt.toDate().toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price?: number) {
  if (!price) return "";
  return `RM ${price.toLocaleString()} / month`;
}

export default function ChatPage() {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedConversationId = searchParams.get("conversation") ?? "";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    getUserConversations(currentUser.uid)
      .then((items) => {
        setConversations(items);
        setSelectedConversationId((current) =>
          requestedConversationId && items.some((item) => item.id === requestedConversationId)
            ? requestedConversationId
            : current || items[0]?.id || "",
        );
      })
      .catch(() => setError("Unable to load your conversations. Please check your Firestore rules."))
      .finally(() => setLoading(false));
  }, [authLoading, currentUser, requestedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    getConversationMessages(selectedConversationId)
      .then(setMessages)
      .catch(() => setError("Unable to load messages."))
      .finally(() => setMessagesLoading(false));
  }, [selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId),
    [conversations, selectedConversationId],
  );

  const isPropertyCardMine = messages[0]?.senderId === currentUser?.uid;

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || !userProfile || !selectedConversationId || !messageText.trim()) return;

    setSending(true);
    setError("");
    try {
      await sendConversationMessage({
        conversationId: selectedConversationId,
        senderId: currentUser.uid,
        senderName: userProfile.name || userProfile.email,
        text: messageText,
      });
      setMessageText("");
      const [updatedConversations, updatedMessages] = await Promise.all([
        getUserConversations(currentUser.uid),
        getConversationMessages(selectedConversationId),
      ]);
      setConversations(updatedConversations);
      setMessages(updatedMessages);
    } catch {
      setError("Unable to send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !currentUser) {
    return (
      <main className="mx-auto min-h-[calc(100vh-145px)] max-w-4xl px-4 pb-20 pt-8 text-slate-950 dark:text-white sm:px-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/75">
          <FiMessageCircle className="mx-auto text-4xl text-emerald-300" />
          <h1 className="mt-4 text-3xl font-black">Login to open chat</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Your messages with owners and tenants will appear here.</p>
          <Link to="/login.html" className="mt-6 inline-flex rounded-2xl bg-indigo-600 px-5 py-3 font-black text-white hover:bg-indigo-500">
            Login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-145px)] max-w-6xl px-4 pb-20 pt-8 text-slate-950 dark:text-white sm:px-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900/75 dark:shadow-black/20">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-white/10 dark:bg-white/5 sm:px-8">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-500 dark:text-emerald-300">
            Chat section
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400 text-xl text-slate-950 shadow-lg shadow-emerald-500/20">
              <FiMessageCircle aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">RentSpace Chat</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Messages from property rental requests will appear here.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="border-b border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 dark:border-red-400/20 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="grid min-h-[560px] lg:grid-cols-[320px_1fr]">
          <aside className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-slate-950/30 lg:border-b-0 lg:border-r">
            {loading ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">Loading chats...</p>
            ) : conversations.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                No messages yet. Send a message from a property page first.
              </div>
            ) : (
              <div className="space-y-3">
                {conversations.map((conversation) => {
                  const isActive = conversation.id === selectedConversationId;
                  const otherName =
                    currentUser?.uid === conversation.ownerId ? conversation.tenantName : conversation.ownerName;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setSelectedConversationId(conversation.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-emerald-300 bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/15"
                          : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-emerald-300/70 dark:hover:text-white"
                      }`}
                    >
                      <p className="font-black">{otherName}</p>
                      <p className={`mt-1 line-clamp-1 text-sm ${isActive ? "text-slate-800" : "text-slate-500 dark:text-slate-400"}`}>
                        {conversation.propertyTitle}
                      </p>
                      <p className={`mt-2 line-clamp-1 text-xs ${isActive ? "text-slate-800" : "text-slate-500 dark:text-slate-500"}`}>
                        {conversation.lastMessage}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="flex flex-col">
            {selectedConversation ? (
              <>
                <div className="border-b border-slate-200 p-5 dark:border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                      {selectedConversation.propertyImageUrl ? (
                        <img src={selectedConversation.propertyImageUrl} alt={selectedConversation.propertyTitle} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-xs font-black text-slate-400">RS</div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-lg font-black">{selectedConversation.propertyTitle}</h2>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {currentUser?.uid === selectedConversation.ownerId ? selectedConversation.tenantName : selectedConversation.ownerName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-8">
                  <div className={isPropertyCardMine ? "flex justify-end" : "flex justify-start"}>
                    <Link
                      to={`/properties/${selectedConversation.propertyId}`}
                      className={`grid max-w-lg gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-emerald-300 dark:border-white/10 dark:bg-white/5 dark:shadow-black/10 sm:grid-cols-[76px_1fr] ${
                        isPropertyCardMine ? "rounded-tr-md" : "rounded-tl-md"
                      }`}
                    >
                      <div className="h-20 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                        {selectedConversation.propertyImageUrl ? (
                          <img
                            src={selectedConversation.propertyImageUrl}
                            alt={selectedConversation.propertyTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-xs font-black text-slate-400">No image</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-950 dark:text-white">{selectedConversation.propertyTitle}</h3>
                        <p className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-300">
                          {formatPrice(selectedConversation.propertyPrice) || "Price unavailable"}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                          {selectedConversation.propertyLocation || "Rental property"}
                        </p>
                      </div>
                    </Link>
                  </div>

                  {messagesLoading ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No messages in this chat yet.</p>
                  ) : (
                    messages.map((chatMessage) => {
                      const isMine = chatMessage.senderId === currentUser?.uid;
                      return (
                        <div key={chatMessage.id} className={isMine ? "ml-auto max-w-[78%]" : "max-w-[78%]"}>
                          <div
                            className={`rounded-3xl p-4 text-sm leading-6 ${
                              isMine
                                ? "rounded-tr-md bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                                : "rounded-tl-md bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200"
                            }`}
                          >
                            {chatMessage.text}
                          </div>
                          <p className={`mt-1 text-xs text-slate-500 ${isMine ? "text-right" : ""}`}>
                            {chatMessage.senderName} {formatTime(chatMessage)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSend} className="border-t border-slate-200 p-5 dark:border-white/10 sm:p-6">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                    <input
                      aria-label="Message"
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      placeholder="Type your message..."
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageText.trim()}
                      className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                      aria-label="Send message"
                    >
                      <FiSend aria-hidden="true" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <FiMessageCircle className="mx-auto text-4xl text-emerald-300" />
                  <h2 className="mt-4 text-2xl font-black">Select a conversation</h2>
                  <p className="mt-2 text-slate-600 dark:text-slate-400">Your property messages will show here.</p>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
