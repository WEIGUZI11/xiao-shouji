import {
  Bot,
  ChevronLeft,
  Folder,
  Gift,
  Image as ImageIcon,
  ImagePlus,
  Mail,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShoppingBag,
  Scissors,
  SmilePlus,
  Sparkles,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { PersistentImage } from '../../../components/PersistentImage';
import { customImageAccept, readCustomImageFile } from '../../../lib/customImage';
import { saveImageAsset } from '../../../lib/imageAssetStore';
import { cn, createId } from '../../../lib/utils';
import { requestAppImage } from '../../../lib/appImageGeneration';
import { buildChatImagePrompt, buildImageGenerationGatePolicy, evaluateImageGenerationGate, hashPrompt, ImageGenerationGateError, isImageGenerationGateError, type ImageTriggerType } from '../../../lib/naiImage';
import { speakWithConfiguredTts } from '../../../tts';
import type { Character, ChatMessage, StickerItem } from '../../../store';
import { useAppStore } from '../../../store';
import { getChatBottomLayoutClass } from './chatLayout';
import { EmptyScreen } from '../../shared/AppPrimitives';
import { describeChatMessage, getCharacterPrompt, getCharacterScenario, getCharacterSupplementalSystemPrompt, requestChatCompletion, stringifyForPrompt } from '../../shared/aiText';
import { buildUserProfilePrompt, resolveUserProfileForCharacter } from '../../user-info/userProfilePrompt';
import { buildChatRequestPreview, buildChatSystemPrompt, parseWeChatReplyParts, resolveGroupReplyPartSpeaker } from '../ai/wechatAi';
import type { WeChatAiParsedPart } from '../ai/wechatAiMessages';
import { buildChatPresetMessages, chatPresetPlaceholderLabels, getChatPresetPlaceholderCoverage, getChatPresetPlaceholderKind } from '../presets/chatPresetEntries';
import { selectRecentChatContext } from '../presets/smallPhonePreset';
import { parseDailyWechatReminderRequest } from '../../active-events/activeEventsLogic';
import { getProactiveReminderClientId, registerBackendProactiveReminder, scheduleNativeLocalProactiveReminder } from '../../active-events/proactiveReminderClient';
import { WeChatAvatar } from '../shared/WeChatShared';
import {
  canAcceptLifeCard,
  getCallScreenForType,
  getManualReplySendIntent,
  getReplyHistoryMessages,
  getPendingResponseMode,
  shouldSubmitChatComposerKey,
  shouldAutoReplyAfterUserAction,
  type PendingChatDraftKind,
} from './wechatInteraction';
import { ChatBubble as Bubble } from './components/ChatBubble';

function speak(text: string) {
  const { ttsConfig } = useAppStore.getState();
  speakWithConfiguredTts(text, ttsConfig);
}

type PendingChatDraft = {
  content: string;
  replyTo?: string;
  kind: PendingChatDraftKind;
  sourceMessageId?: string;
};

export function ChatScreen() {
  const {
    activeChatId,
    activeChannel,
    characters,
    groupChats,
    chatSessions,
    updateCharacter,
    addMessage,
    addMessages,
    updateMessage,
    deleteMessage,
    toggleMessageFavorite,
    recallMessage,
    markVoiceMessagePlayed,
    setScreen,
    addPurchaseRecord,
    addGalleryPhoto,
    addCalendarEvent,
    addLifeEvent,
    goBack,
    stickers,
    ttsEnabled,
    imageGenerationConfig,
    imageGenerationEnabled,
    proactiveImageGenerationEnabled,
    generatedImageRecords,
    recordGeneratedImage,
    addAppLog,
    apiBaseUrl,
    apiKey,
    selectedModel,
    chatPresetPrompt,
    chatPresetEntries,
    chatContextDepth,
    chatTemperature,
    chatMaxTokens,
    chatReplyStyle,
    userName,
    activeUserProfileId,
    userProfile,
    userProfiles,
    userProfileCharacterBindings,
    chatBottomLayout,
  } = useAppStore(useShallow((state) => ({
    activeChatId: state.activeChatId,
    activeChannel: state.activeChannel,
    characters: state.characters,
    groupChats: state.groupChats,
    chatSessions: state.chatSessions,
    updateCharacter: state.updateCharacter,
    addMessage: state.addMessage,
    addMessages: state.addMessages,
    updateMessage: state.updateMessage,
    deleteMessage: state.deleteMessage,
    toggleMessageFavorite: state.toggleMessageFavorite,
    recallMessage: state.recallMessage,
    markVoiceMessagePlayed: state.markVoiceMessagePlayed,
    setScreen: state.setScreen,
    addPurchaseRecord: state.addPurchaseRecord,
    addGalleryPhoto: state.addGalleryPhoto,
    addCalendarEvent: state.addCalendarEvent,
    addLifeEvent: state.addLifeEvent,
    goBack: state.goBack,
    stickers: state.stickers,
    ttsEnabled: state.ttsEnabled,
    imageGenerationConfig: state.imageGenerationConfig,
    imageGenerationEnabled: state.imageGenerationEnabled,
    proactiveImageGenerationEnabled: state.proactiveImageGenerationEnabled,
    generatedImageRecords: state.generatedImageRecords,
    recordGeneratedImage: state.recordGeneratedImage,
    addAppLog: state.addAppLog,
    apiBaseUrl: state.apiBaseUrl,
    apiKey: state.apiKey,
    selectedModel: state.selectedModel,
    chatPresetPrompt: state.chatPresetPrompt,
    chatPresetEntries: state.chatPresetEntries,
    chatContextDepth: state.chatContextDepth,
    chatTemperature: state.chatTemperature,
    chatMaxTokens: state.chatMaxTokens,
    chatReplyStyle: state.chatReplyStyle,
    userName: state.userName,
    activeUserProfileId: state.activeUserProfileId,
    userProfile: state.userProfile,
    userProfiles: state.userProfiles,
    userProfileCharacterBindings: state.userProfileCharacterBindings,
    chatBottomLayout: state.chatBottomLayout,
  })));
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [showPlusPanel, setShowPlusPanel] = useState(false);
  const [replyDraft, setReplyDraft] = useState<string | null>(null);
  const [lifeComposer, setLifeComposer] = useState<'transfer' | 'red-packet' | 'shopping' | null>(null);
  const [lifeDraft, setLifeDraft] = useState({ amount: '', note: '', itemName: '' });
  const [imageDraft, setImageDraft] = useState('');
  const [showImageComposer, setShowImageComposer] = useState(false);
  const [showChatInfo, setShowChatInfo] = useState(false);
  const [chatBackgroundStatus, setChatBackgroundStatus] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState('');
  const [pendingUserDrafts, setPendingUserDrafts] = useState<PendingChatDraft[]>([]);
  const [failedDraft, setFailedDraft] = useState<{ drafts: PendingChatDraft[]; mode: 'text' | 'voice'; error?: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolMessageId, setActiveToolMessageId] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [visibleMessageCount, setVisibleMessageCount] = useState(200);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScreenRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const chatBackgroundInputRef = useRef<HTMLInputElement>(null);
  const directCharacter = characters.find((item) => item.id === activeChatId);
  const chatBackgroundImage = directCharacter?.chatBackgroundImage || '';
  const activeGroup = groupChats.find((item) => item.id === activeChatId);
  const groupMembers = activeGroup
    ? activeGroup.memberIds
        .map((id) => characters.find((item) => item.id === id))
        .filter((item): item is Character => Boolean(item))
    : [];
  const groupAppName = activeChannel === 'qq' ? 'QQ' : '微信';
  const character = directCharacter || (activeGroup
    ? {
        id: activeGroup.id,
        name: activeGroup.name,
        avatar: '',
        description: `${groupAppName}群聊，成员：${activeGroup.memberIds.map((id) => characters.find((item) => item.id === id)?.name).filter(Boolean).join('、')}`,
        personality: '群聊会自然地出现不同成员的短回复。',
        firstMessage: `${activeGroup.name} 已创建，可以开始聊天。`,
        systemPrompt: [
          `你正在模拟${groupAppName}群聊「${activeGroup.name}」。`,
          '你要同时扮演群里的多个成员，不要只扮演一个人。',
          `每条回复用「成员名：消息内容」格式，像${groupAppName}群里不同人轮流说话。`,
          activeGroup.memberIds
            .map((id) => characters.find((item) => item.id === id))
            .filter((item): item is Character => Boolean(item))
            .map((item) => getCharacterPrompt(item))
            .join('\n\n---\n\n'),
        ].filter(Boolean).join('\n\n'),
      } satisfies Character
    : undefined);
  const session = activeChatId ? chatSessions[`${activeChannel}:${activeChatId}`] : undefined;
  const messages = session?.messages || [];
  const hiddenMessageCount = Math.max(0, messages.length - visibleMessageCount);
  const visibleMessages = hiddenMessageCount > 0 ? messages.slice(-visibleMessageCount) : messages;
  const isWechat = activeChannel === 'wechat';
  const isQq = activeChannel === 'qq';
  const chatAppName = isQq ? 'QQ' : '微信';
  const getChatUserProfile = (characterId?: string | null) => resolveUserProfileForCharacter({
    characterId,
    activeUserName: userName,
    activeUserProfile: userProfile,
    userProfiles,
    bindings: userProfileCharacterBindings,
  });
  const channelPresetPrompt = chatPresetPrompt;
  const chatSubtitle = activeGroup ? `${groupMembers.length}个成员` : activeChannel === 'qq' ? 'QQ聊天' : '';

  const updateChatBackground = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !directCharacter) return;
    setChatBackgroundStatus('正在保存背景…');
    try {
      const reference = await saveImageAsset(await readCustomImageFile(file));
      updateCharacter(directCharacter.id, { chatBackgroundImage: reference });
      setChatBackgroundStatus(`已更换 ${directCharacter.name} 的微信 / QQ 私聊背景。`);
    } catch (error) {
      setChatBackgroundStatus(error instanceof Error ? error.message : '聊天背景保存失败。');
    } finally {
      event.target.value = '';
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeChatId]);

  useEffect(() => {
    setActiveToolMessageId(null);
    setSelectedMessageIds([]);
    setVisibleMessageCount(200);
  }, [activeChatId, activeChannel]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const scrollToLatest = () => window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
    viewport.addEventListener('resize', scrollToLatest);
    viewport.addEventListener('scroll', scrollToLatest);
    return () => {
      viewport.removeEventListener('resize', scrollToLatest);
      viewport.removeEventListener('scroll', scrollToLatest);
    };
  }, [activeChatId]);

  const revealFocusedComposer = (element: HTMLElement) => {
    window.setTimeout(() => {
      element.closest('.wechat-life-composer')?.scrollIntoView({ block: 'nearest' });
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 120);
  };

  if (!character || !activeChatId) return <EmptyScreen title="没有选中角色" />;

  const selectedMessageCount = selectedMessageIds.length;
  const isSelectingMessages = selectedMessageCount > 0;
  const startMessageSelection = (messageId: string) => {
    setActiveToolMessageId(null);
    setSelectedMessageIds([messageId]);
  };
  const toggleMessageSelection = (messageId: string) => {
    setActiveToolMessageId(null);
    setSelectedMessageIds((current) => current.includes(messageId)
      ? current.filter((id) => id !== messageId)
      : [...current, messageId]);
  };
  const cancelMessageSelection = () => {
    setSelectedMessageIds([]);
  };
  const deleteSelectedMessages = () => {
    if (selectedMessageIds.length === 0) return;
    const selected = new Set(selectedMessageIds);
    selectedMessageIds.forEach((messageId) => deleteMessage(activeChatId, activeChannel, messageId));
    setPendingUserDrafts((drafts) => drafts.filter((draft) => !draft.sourceMessageId || !selected.has(draft.sourceMessageId)));
    setFailedDraft((current) => current
      ? {
          ...current,
          drafts: current.drafts.filter((draft) => !draft.sourceMessageId || !selected.has(draft.sourceMessageId)),
        }
      : current);
    setSelectedMessageIds([]);
    setActiveToolMessageId(null);
  };

  const formatDrafts = (drafts: PendingChatDraft[]) =>
    drafts.map((draft, index) => {
      const prefix = drafts.length > 1 ? `第${index + 1}条：` : '';
      return `${prefix}${draft.replyTo ? `引用「${draft.replyTo}」回复：` : ''}${draft.content}`;
    }).join('\n');

  const pickStickerForMood = (mood?: string) => {
    if (stickers.length === 0) return undefined;
    const keyword = (mood || '').toLowerCase();
    return stickers.find((sticker) => sticker.label.toLowerCase().includes(keyword)) || stickers[0];
  };

  const formatImageGateReason = (reason: string, retryAfterMs?: number) => {
    const suffix = retryAfterMs ? `，约 ${Math.ceil(retryAfterMs / 1000)} 秒后再试` : '';
    const labels: Record<string, string> = {
      character_cooldown: '角色冷却中',
      channel_cooldown: '频道冷却中',
      user_cooldown: '用户冷却中',
      daily_quota: '今日额度已用完',
      retry_limit: '失败重试次数过多',
      duplicate_prompt: '重复 prompt 已去重',
      similar_prompt: '连续相似 prompt 已拦截',
    };
    return `${labels[reason] || reason}${suffix}`;
  };

  const getChatConnectionIssue = () => {
    const missing = [
      !apiBaseUrl.trim() ? '接口地址' : '',
      !selectedModel.trim() ? '模型' : '',
    ].filter(Boolean);
    return missing.length > 0 ? `聊天 API 未连接：缺少${missing.join('和')}。` : '';
  };

  const buildLifeMessage = (part: WeChatAiParsedPart, speaker?: Character): ChatMessage => {
    const base = {
      id: createId('msg'),
      role: 'model' as const,
      timestamp: Date.now(),
      speakerId: activeGroup && speaker ? speaker.id : undefined,
    };
    if (part.kind === 'sticker') {
      const sticker = pickStickerForMood(part.mood || part.label);
      if (!sticker) {
        return {
          ...base,
          content: part.label || part.mood || '发你一个表情。',
          kind: 'text',
        };
      }
      return {
        ...base,
        content: sticker.url,
        kind: 'sticker',
        stickerLabel: sticker.label,
      };
    }
    if (part.kind === 'transfer') {
      return {
        ...base,
        content: part.note || '转账',
        kind: 'transfer',
        amount: part.amount,
        note: part.note,
        status: 'pending',
      };
    }
    if (part.kind === 'red-packet') {
      return {
        ...base,
        content: part.note || '恭喜发财，大吉大利',
        kind: 'red-packet',
        amount: part.amount,
        note: part.note || '恭喜发财，大吉大利',
        status: 'pending',
      };
    }
    if (part.kind === 'shopping') {
      return {
        ...base,
        content: part.note || part.itemName,
        kind: 'shopping',
        itemName: part.itemName,
        amount: part.amount,
        note: part.note,
      };
    }
    if (part.kind === 'image') {
      return {
        ...base,
        content: `想发一张图：${part.prompt}`,
        kind: 'text',
      };
    }
    return {
      ...base,
      content: part.content,
      kind: 'text',
    };
  };

  const createGeneratedImageMessage = async ({
    prompt,
    role,
    speaker,
    replyTo,
    triggerType,
  }: {
    prompt: string;
    role: 'user' | 'model';
    speaker?: Character;
    replyTo?: string;
    triggerType: ImageTriggerType;
  }): Promise<ChatMessage> => {
    const now = Date.now();
    const imageId = createId('image');
    const targetCharacterId = role === 'model' ? speaker?.id || character.id : character.id;
    const channelId = `${activeChannel}:${activeChatId}`;
    const currentChatUser = getChatUserProfile(character.id);
    const userId = currentChatUser.id || activeUserProfileId || userName || 'local-user';
    const imageCharacter = role === 'model' ? speaker || character : character;
    const fullPrompt = buildChatImagePrompt({
      prompt,
      speakerName: speaker?.name,
      characterTags: imageCharacter.imagePromptTags,
      context: 'wechat',
    });
    const gate = evaluateImageGenerationGate({
      now,
      characterId: targetCharacterId,
      channelId,
      userId,
      prompt: fullPrompt,
      triggerType,
      policy: buildImageGenerationGatePolicy(triggerType),
      records: generatedImageRecords,
    });
    const logBase = `trigger=${triggerType}; user=${userId}; bot=${activeChannel}; character=${targetCharacterId}; channel=${channelId}; prompt_hash=${gate.promptHash}; model=${imageGenerationConfig.model}; size=${imageGenerationConfig.width}x${imageGenerationConfig.height}`;
    if (!gate.allowed) {
      const detail = `${logBase}; blocked=${gate.reason}`;
      addAppLog({ type: 'info', title: `${chatAppName} NAI 生图被限制`, detail });
      throw new ImageGenerationGateError(gate.reason, formatImageGateReason(gate.reason, gate.retryAfterMs), gate.retryAfterMs);
    }
    addAppLog({ type: 'image', title: `${chatAppName} NAI 生图开始`, detail: logBase });
    let imageUrl: string;
    try {
      imageUrl = await requestAppImage({
        config: imageGenerationConfig,
        prompt: fullPrompt,
        triggerType,
        imageGenerationEnabled,
        proactiveImageGenerationEnabled,
        source: triggerType === 'proactive' ? 'proactive' : activeChannel === 'qq' ? 'qq-chat' : 'wechat-chat',
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : '未知错误';
      recordGeneratedImage({
        imageId,
        botId: activeChannel,
        characterId: targetCharacterId,
        guildId: 'local-small-phone',
        channelId,
        userId,
        triggerType,
        promptHash: gate.promptHash,
        promptText: fullPrompt,
        createdAt: now,
        width: imageGenerationConfig.width,
        height: imageGenerationConfig.height,
        model: imageGenerationConfig.model,
        status: 'failure',
        error: detail,
      });
      addAppLog({ type: 'error', title: `${chatAppName} NAI 生图 API 失败`, detail: `${logBase}; error=${detail}` });
      throw error;
    }
    const label = prompt.trim().slice(0, 38) || 'AI 生图';
    const message: ChatMessage = {
      id: createId('msg'),
      role,
      content: imageUrl,
      timestamp: Date.now(),
      kind: 'image',
      stickerLabel: label,
      speakerId: activeGroup && speaker ? speaker.id : undefined,
      replyTo,
    };
    const galleryPhotoId = addGalleryPhoto({
      url: imageUrl,
      title: role === 'user' ? `${chatAppName}生图` : `${speaker?.name || character.name}发来的图`,
      description: prompt,
      album: '聊天',
      tags: [chatAppName, 'AI生图'],
      source: 'chat',
      characterId: role === 'model' ? speaker?.id || character.id : undefined,
      readableByChar: true,
    });
    recordGeneratedImage({
      imageId,
      botId: activeChannel,
      characterId: targetCharacterId,
      guildId: 'local-small-phone',
      channelId,
      userId,
      triggerType,
      promptHash: gate.promptHash,
      promptText: fullPrompt,
      storageUrl: imageUrl,
      galleryPhotoId,
      createdAt: now,
      width: imageGenerationConfig.width,
      height: imageGenerationConfig.height,
      model: imageGenerationConfig.model,
      status: 'success',
    });
    addAppLog({ type: 'image', title: `${chatAppName} NAI 生图成功`, detail: `${logBase}; image_id=${imageId}; gallery_photo_id=${galleryPhotoId}; storage_url=data-url/gallery` });
    return message;
  };

  const addAssistantReply = async (drafts: PendingChatDraft[], responseMode: 'text' | 'voice') => {
    const content = formatDrafts(drafts);
    setIsTyping(true);
    const activeNarrationVariant = chatPresetEntries.find((entry) => entry.enabled && entry.variant)?.variant;
    const narrationInstruction = activeNarrationVariant === 'narration-none'
      ? '本轮只写聊天，不写任何括号动作、心理或环境旁白。'
      : activeNarrationVariant === 'narration-occasional'
        ? '本轮允许在确有必要时低频加入一小段全角括号场景，但不能每轮强行出现。'
        : '括号动作或心理描写只能低频偶尔出现。';
    const styleInstruction = [
      chatReplyStyle === 'single'
        ? `使用长 RP：把本轮完整内容放在一条${chatAppName}气泡里，可以自然分段，约 100—500 个汉字，必须完整收尾。`
        : chatReplyStyle === 'burst'
          ? `使用短 RP：像熟人聊天一样回复一到四条短${chatAppName}消息，每条消息单独一行，每行必须是完整意思，不能截成残句。`
          : `根据本轮情境和角色性格，在短 RP 与长 RP 之间自然选择；短回复每行是一个完整气泡，长回复保留在一个气泡并完整收尾。`,
      narrationInstruction,
    ].join('\n');

    const spokenReplies: string[] = [];
    const connectionIssue = getChatConnectionIssue();
    if (connectionIssue) {
      addAppLog({ type: 'error', title: `${chatAppName}聊天 API 未连接`, detail: connectionIssue });
      throw new Error(connectionIssue);
    }
    const requestOneReply = async (speaker: Character, memberInstruction = '') => {
      const chatUserProfile = getChatUserProfile(speaker.id);
      const userProfilePrompt = buildUserProfilePrompt(chatUserProfile.name, chatUserProfile.profile);
      const historyCandidates = getReplyHistoryMessages(messages, drafts).filter((message) => !message.recalled);
      const historyMessages = selectRecentChatContext(
        historyCandidates,
        chatContextDepth,
      ).map((message) => ({
        role: message.role === 'model' ? 'assistant' as const : 'user' as const,
        content: describeChatMessage(message, true, characters),
      }));
      const placeholderCoverage = getChatPresetPlaceholderCoverage(chatPresetEntries);
      const characterScenario = getCharacterScenario(character);
      const supplementalSystemPrompt = getCharacterSupplementalSystemPrompt(character);
      const worldInfo = character.worldBook ? stringifyForPrompt(character.worldBook) : '';
      const presetRuntimeContext = {
        userName: chatUserProfile.name,
        userProfilePrompt,
        characterName: character.name,
        characterDescription: character.description,
        characterPersonality: character.personality,
        characterScenario,
        worldInfoBefore: placeholderCoverage.worldInfoBefore ? worldInfo : '',
        worldInfoAfter: !placeholderCoverage.worldInfoBefore && placeholderCoverage.worldInfoAfter ? worldInfo : '',
        dialogueExamples: character.messageExamples || '',
        historyMessages,
        replyStyle: chatReplyStyle,
      };
      const structuredPresetMessages = buildChatPresetMessages(chatPresetEntries, presetRuntimeContext);
      const activePresetEntries = chatPresetEntries.filter((entry) => (
        entry.enabled
        && (!entry.activeForReplyStyles || entry.activeForReplyStyles.includes(chatReplyStyle))
      ));
      const structuredIdentityActive = activePresetEntries.some((entry) => entry.id === 'small-phone-head');
      const structuredReplyContractActive = activePresetEntries.some((entry) => (
        entry.id === 'small-phone-short-rp'
        || entry.id === 'small-phone-long-rp'
        || entry.id === 'small-phone-output-contract'
      ));
      const fallbackCharacterPrompt = [
        !placeholderCoverage.charDescription && character.description ? `人设：${character.description}` : '',
        !placeholderCoverage.charPersonality && character.personality ? `性格：${character.personality}` : '',
        !placeholderCoverage.scenario && characterScenario ? `场景：${characterScenario}` : '',
        !placeholderCoverage.dialogueExamples && character.messageExamples ? `聊天示例：\n${character.messageExamples}` : '',
        !placeholderCoverage.worldInfoBefore && !placeholderCoverage.worldInfoAfter && worldInfo ? `世界书：\n${worldInfo}` : '',
        supplementalSystemPrompt ? `补充系统提示：${supplementalSystemPrompt}` : '',
      ].filter(Boolean).join('\n');
      const requestMessages = [
        {
          role: 'system' as const,
          content: buildChatSystemPrompt({
            channel: activeChannel,
            characterPrompt: fallbackCharacterPrompt,
            characterName: character.name,
            memberInstruction,
            userProfilePrompt: placeholderCoverage.personaDescription ? '' : userProfilePrompt,
            chatPresetPrompt: structuredPresetMessages.length > 0 ? '' : channelPresetPrompt,
            styleInstruction,
            isGroupChat: Boolean(activeGroup),
            replyStyle: chatReplyStyle,
            allowProactiveImage: imageGenerationEnabled && proactiveImageGenerationEnabled,
            structuredPresetActive: structuredPresetMessages.length > 0,
            structuredIdentityActive,
            structuredReplyContractActive,
          }),
        },
        ...structuredPresetMessages,
        ...(!placeholderCoverage.chatHistory ? historyMessages : []),
        { role: 'user' as const, content },
      ];
      const presetPlacement = chatPresetEntries.flatMap((entry, index) => {
        if (!entry.enabled) return [];
        if (entry.activeForReplyStyles && !entry.activeForReplyStyles.includes(chatReplyStyle)) return [];
        const kind = getChatPresetPlaceholderKind(entry);
        return [`${index + 1}. ${entry.name}${kind ? ` → ${chatPresetPlaceholderLabels[kind]}` : ` → ${entry.role}`}`];
      });
      addAppLog({
        type: 'ai',
        title: `${chatAppName}聊天请求预览`,
        detail: [
          `channel=${activeChannel}:${activeChatId}`,
          `speaker=${speaker.name}`,
          `messages=${requestMessages.length}`,
          `history_limit=${chatContextDepth}; history_available=${historyCandidates.length}; history_sent=${historyMessages.length}`,
          `runtime_sources=user_profile:${userProfilePrompt ? 'yes' : 'no'}, character_description:${character.description ? 'yes' : 'no'}, personality:${character.personality ? 'yes' : 'no'}, scenario:${characterScenario ? 'yes' : 'no'}, world_info:${worldInfo ? 'yes' : 'no'}, examples:${character.messageExamples ? 'yes' : 'no'}`,
          presetPlacement.length > 0 ? `酒馆动态条目位置：\n${presetPlacement.join('\n')}` : '未发现酒馆动态条目，使用兼容发送顺序。',
          buildChatRequestPreview(requestMessages),
        ].join('\n'),
      });
      const reply = await requestChatCompletion({
          baseUrl: apiBaseUrl,
          apiKey,
          model: selectedModel,
          temperature: chatTemperature,
          maxTokens: chatMaxTokens,
          messages: requestMessages,
        });
      return parseWeChatReplyParts(reply, chatReplyStyle, speaker.name, activeChannel, Boolean(activeGroup));
    };

    const speakers = activeGroup && groupMembers.length > 0 ? [groupMembers[0]] : [character];
    const responseMessages: ChatMessage[] = [];
    const responsePurchases: Array<{ characterId: string; itemName: string; amount: string; note: string }> = [];
    const responseTimestamp = Date.now();
    for (let speakerIndex = 0; speakerIndex < speakers.length; speakerIndex += 1) {
      const speaker = speakers[speakerIndex];
      const memberInstruction = activeGroup
        ? [
            `你正在模拟${chatAppName}群聊「${activeGroup.name}」。`,
            `可发言成员：${groupMembers.map((member) => member.name).join('、')}。`,
            '请根据刚才的消息和每个成员的人设，挑选 1 到 4 位成员自然接话；不是所有成员都必须回复。',
            '每行必须使用「成员名：消息内容」格式，成员名必须来自可发言成员。',
          ].join('\n')
        : '';
      const parts = await requestOneReply(speaker, memberInstruction);
      for (let index = 0; index < parts.length; index += 1) {
        const resolved = activeGroup
          ? resolveGroupReplyPartSpeaker(parts[index], speaker, groupMembers)
          : { part: parts[index], speaker };
        const { part } = resolved;
        const messageSpeaker = resolved.speaker;
        if (part.kind === 'image') {
          try {
            const imageMessage = await createGeneratedImageMessage({ prompt: part.prompt, role: 'model', speaker: messageSpeaker, triggerType: 'proactive' });
            imageMessage.timestamp = responseTimestamp + responseMessages.length;
            responseMessages.push(imageMessage);
          } catch (error) {
            if (isImageGenerationGateError(error)) {
              addAppLog({ type: 'info', title: `${chatAppName} char 主动生图跳过`, detail: `trigger=proactive; character=${messageSpeaker.id}; channel=${activeChannel}:${activeChatId}; reason=${error.reason}` });
              if (parts.length === 1) {
                const fallbackMessage = buildLifeMessage({ kind: 'text', content: `想给你看的是：${part.prompt}` }, messageSpeaker);
                fallbackMessage.timestamp = responseTimestamp + responseMessages.length;
                responseMessages.push(fallbackMessage);
              }
              continue;
            }
            const message = buildLifeMessage(part, messageSpeaker);
            message.content = '图刚刚没发出去，我等下再发你。';
            message.timestamp = responseTimestamp + responseMessages.length;
            responseMessages.push(message);
            addAppLog({ type: 'error', title: `${chatAppName} char 生图失败`, detail: `trigger=proactive; character=${messageSpeaker.id}; channel=${activeChannel}:${activeChatId}; error=${error instanceof Error ? error.message : '未知错误'}` });
          }
          continue;
        }
        const message = buildLifeMessage(part, messageSpeaker);
        if (part.kind === 'text' && responseMode === 'voice') {
          message.kind = 'voice';
          message.duration = Math.max(2, Math.ceil(message.content.length / 4));
          message.transcript = message.content;
        }
        message.timestamp = responseTimestamp + responseMessages.length;
        responseMessages.push(message);
        if (message.kind === 'shopping') {
          responsePurchases.push({
            characterId: messageSpeaker.id,
            itemName: message.itemName || message.content,
            amount: message.amount || '',
            note: message.note || `${chatAppName}聊天里提到的购物`,
          });
        }
        if (message.kind === 'text' || message.kind === 'voice') spokenReplies.push(message.content);
      }
    }
    addMessages(activeChatId, activeChannel, responseMessages);
    responsePurchases.forEach(addPurchaseRecord);
    setIsTyping(false);
    if (ttsEnabled && responseMode === 'voice' && !activeGroup) speak(spokenReplies.join('\n'));
  };

  const requestReplyForDrafts = async (drafts: PendingChatDraft[], responseMode = getPendingResponseMode(drafts)) => {
    if (sending || drafts.length === 0) return;
    setSending(true);
    try {
      await addAssistantReply(drafts, responseMode);
      setPendingUserDrafts([]);
      setFailedDraft(null);
    } catch (error) {
      setFailedDraft({ drafts, mode: responseMode, error: error instanceof Error ? error.message : undefined });
    } finally {
      setIsTyping(false);
      setSending(false);
    }
  };

  const queueUserDraft = (draft: PendingChatDraft, options?: Parameters<typeof shouldAutoReplyAfterUserAction>[1]) => {
    const nextDrafts = [...pendingUserDrafts, draft];
    setPendingUserDrafts(nextDrafts);
    if (shouldAutoReplyAfterUserAction(draft.kind, options)) {
      void requestReplyForDrafts(nextDrafts);
    }
  };

  const send = async () => {
    const content = input.trim();
    if (sending) return;
    const intent = getManualReplySendIntent({ content, pendingDraftCount: pendingUserDrafts.length });
    if (intent === 'idle') return;
    if (intent === 'request-assistant-reply') {
      await requestReplyForDrafts(pendingUserDrafts);
      return;
    }
    const kind = mode === 'voice' ? 'voice' : 'text';
    const replyTo = replyDraft || undefined;
    const id = createId('msg');
    addMessage(activeChatId, activeChannel, {
      id,
      role: 'user',
      content,
      timestamp: Date.now(),
      kind,
      duration: Math.max(2, Math.ceil(content.length / 4)),
      transcript: kind === 'voice' ? content : undefined,
      replyTo,
    });
    if (activeChannel === 'wechat') {
      const reminder = parseDailyWechatReminderRequest(content, {
        now: Date.now(),
        characterId: directCharacter?.id || (!activeGroup ? activeChatId : undefined) || undefined,
        sourceMessageId: id,
      });
      if (reminder) {
        const calendarId = addCalendarEvent(reminder.calendarEvent);
        addLifeEvent({
          ...reminder.lifeEvent,
          sourceId: reminder.lifeEvent.sourceId || `wechat-reminder-${calendarId}`,
        });
        const reminderAt = new Date(reminder.calendarEvent.reminderAt || reminder.calendarEvent.startAt);
        const task = reminder.calendarEvent.title.replace(/^每天\s*\d{1,2}:\d{2}\s*提醒[:：]?/, '').trim() || reminder.calendarEvent.title;
        void registerBackendProactiveReminder({
          clientId: getProactiveReminderClientId(),
          calendarEventId: calendarId,
          characterId: reminder.calendarEvent.characterId,
          characterName: directCharacter?.name,
          channel: 'wechat',
          title: reminder.calendarEvent.title,
          task,
          hour: reminderAt.getHours(),
          minute: reminderAt.getMinutes(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
          enabled: true,
          sourceMessageId: id,
          createdAt: Date.now(),
        }).catch((error) => {
          addAppLog({
            type: 'error',
            title: `${chatAppName}主动提醒后端注册失败`,
            detail: error instanceof Error ? error.message : String(error),
          });
        });
        const localScheduled = scheduleNativeLocalProactiveReminder({
          id: `local-${calendarId}`,
          title: `${directCharacter?.name || chatAppName}提醒你`,
          body: task,
          hour: reminderAt.getHours(),
          minute: reminderAt.getMinutes(),
          data: {
            type: 'proactive-reminder',
            calendarEventId: calendarId,
            characterId: reminder.calendarEvent.characterId,
            channel: 'wechat',
          },
        });
        addAppLog({
          type: 'info',
          title: `${chatAppName}长期主动提醒已记录`,
          detail: `calendar_id=${calendarId}; character=${reminder.calendarEvent.characterId || 'none'}; repeat=${reminder.calendarEvent.repeat}; reminder_at=${new Date(reminder.calendarEvent.reminderAt || reminder.calendarEvent.startAt).toLocaleString('zh-CN')}; native_local=${localScheduled ? 'scheduled' : 'unavailable'}; title=${reminder.calendarEvent.title}`,
        });
      }
    }
    queueUserDraft({ content, replyTo, kind, sourceMessageId: id });
    setInput('');
    setReplyDraft(null);
    setFailedDraft(null);
  };

  const retryFailed = async () => {
    if (!failedDraft || sending) return;
    setSending(true);
    try {
      await addAssistantReply(failedDraft.drafts, failedDraft.mode);
      setFailedDraft(null);
      setPendingUserDrafts([]);
    } catch (error) {
      setFailedDraft((current) => current ? { ...current, error: error instanceof Error ? error.message : undefined } : failedDraft);
    } finally {
      setIsTyping(false);
      setSending(false);
    }
  };

  const sendSticker = (sticker: StickerItem) => {
    const replyTo = replyDraft || undefined;
    const id = createId('msg');
    addMessage(activeChatId, activeChannel, {
      id,
      role: 'user',
      content: sticker.url,
      timestamp: Date.now(),
      kind: 'sticker',
      stickerLabel: sticker.label,
      replyTo,
    });
    queueUserDraft({ content: `表情包：${sticker.label}`, replyTo, kind: 'sticker', sourceMessageId: id });
    setReplyDraft(null);
    setFailedDraft(null);
    setShowPlusPanel(false);
  };

  const addCallNote = (type: 'voice' | 'video') => {
    const id = createId('msg');
    const label = type === 'voice' ? '发起语音通话' : '发起视频通话';
    addMessage(activeChatId, activeChannel, {
      id,
      role: 'user',
      content: label,
      timestamp: Date.now(),
      kind: 'call-note',
    });
    setPendingUserDrafts((drafts) => [...drafts, { content: label, kind: 'call-note', sourceMessageId: id }]);
    setShowPlusPanel(false);
    setShowChatInfo(false);
    setScreen(getCallScreenForType(type));
  };

  const cancelCallNote = (messageId: string) => {
    deleteMessage(activeChatId, activeChannel, messageId);
    setPendingUserDrafts((drafts) => drafts.filter((draft) => draft.sourceMessageId !== messageId));
    setFailedDraft(null);
  };

  const sendImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || sending) return;
    const replyTo = replyDraft || undefined;
    const reader = new FileReader();
    reader.onload = async () => {
      const imageUrl = reader.result as string;
      const safeFileName = file.name.length > 42 ? `${file.name.slice(0, 22)}…${file.name.slice(-12)}` : file.name;
      const id = createId('msg');
      addMessage(activeChatId, activeChannel, {
        id,
        role: 'user',
        content: imageUrl,
        timestamp: Date.now(),
        kind: 'image',
        stickerLabel: safeFileName,
        replyTo,
      });
      queueUserDraft({ content: `图片：${safeFileName}`, replyTo, kind: 'image', sourceMessageId: id });
      setReplyDraft(null);
      setFailedDraft(null);
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  const sendGeneratedImage = async () => {
    const prompt = imageDraft.trim();
    if (!prompt || generatingImage || sending) return;
    setGeneratingImage(true);
    setImageGenerationError('');
    try {
      const replyTo = replyDraft || undefined;
      const message = await createGeneratedImageMessage({ prompt, role: 'user', replyTo, triggerType: 'manual' });
      addMessage(activeChatId, activeChannel, message);
      setImageDraft('');
      setShowImageComposer(false);
      setImageGenerationError('');
      setReplyDraft(null);
      setFailedDraft(null);
      setShowPlusPanel(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : '生图失败';
      setImageGenerationError(message);
      if (pendingUserDrafts.length > 0) setFailedDraft({ drafts: pendingUserDrafts, mode: 'text', error: message });
      setShowImageComposer(true);
      addAppLog({ type: 'error', title: `${chatAppName} NAI 生图失败`, detail: `trigger=manual; user=${activeUserProfileId || userName || 'local-user'}; character=${character.id}; channel=${activeChannel}:${activeChatId}; prompt_hash=${hashPrompt(prompt)}; error=${message}` });
    } finally {
      setGeneratingImage(false);
    }
  };

  const resetLifeDraft = () => {
    setLifeDraft({ amount: '', note: '', itemName: '' });
    setLifeComposer(null);
  };

  const acceptLifeCard = (message: ChatMessage) => {
    if (!canAcceptLifeCard(message) || sending) return;
    updateMessage(activeChatId, activeChannel, message.id, { status: 'accepted' });
    const label = message.kind === 'red-packet' ? '我收了红包' : '我收了转账';
    const content = `${label}${message.amount ? `：${message.amount}` : ''}${message.note ? `，${message.note}` : ''}`;
    const id = createId('msg');
    addMessage(activeChatId, activeChannel, {
      id,
      role: 'user',
      content,
      timestamp: Date.now(),
      kind: 'text',
      replyTo: describeChatMessage(message).slice(0, 60),
    });
    setReplyDraft(null);
    setFailedDraft(null);
    queueUserDraft({
      content,
      replyTo: describeChatMessage(message, true, characters).slice(0, 80),
      kind: message.kind,
      sourceMessageId: id,
    });
  };

  const sendLifeCard = () => {
    if (!lifeComposer) return;
    const amount = lifeDraft.amount.trim();
    const note = lifeDraft.note.trim();
    const itemName = lifeDraft.itemName.trim();
    if ((lifeComposer === 'transfer' || lifeComposer === 'red-packet') && !amount) return;
    if (lifeComposer === 'shopping' && !itemName) return;
    const replyTo = replyDraft || undefined;
    const message: ChatMessage = {
      id: createId('msg'),
      role: 'user',
      content: note || itemName || (lifeComposer === 'red-packet' ? '恭喜发财，大吉大利' : '转账'),
      timestamp: Date.now(),
      kind: lifeComposer,
      amount: amount || undefined,
      note: note || undefined,
      itemName: itemName || undefined,
      status: 'pending',
      replyTo,
    };
    addMessage(activeChatId, activeChannel, message);
    if (lifeComposer === 'shopping') {
      addPurchaseRecord({
        characterId: directCharacter?.id || groupMembers[0]?.id || '',
        itemName,
        amount,
        note,
      });
    }
    queueUserDraft({
      content: describeChatMessage(message, true, characters),
      replyTo,
      kind: lifeComposer,
      sourceMessageId: message.id,
    });
    setReplyDraft(null);
    setFailedDraft(null);
    resetLifeDraft();
    setShowPlusPanel(false);
  };

  return (
    <section ref={chatScreenRef} className={cn('relative flex h-full flex-col', isWechat && 'wechat-chat-screen', isQq && 'qq-chat-screen', chatBackgroundImage && 'has-custom-chat-background', getChatBottomLayoutClass(chatBottomLayout))}>
      {chatBackgroundImage && (
        <>
          <PersistentImage src={chatBackgroundImage} alt="" className="chat-background-image" aria-hidden="true" />
          <span className="chat-background-shade" aria-hidden="true" />
        </>
      )}
      <div className={cn('px-4 pb-4 pt-6', isWechat && 'wechat-chat-header', isQq && 'qq-chat-header')}>
        <div className="grid grid-cols-[46px_1fr_46px] items-center">
          <button type="button" onClick={goBack} className="wechat-icon-button" aria-label="返回">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="min-w-0 text-center">
            <h2 className="truncate text-xl font-black">{character.name}</h2>
            {chatSubtitle && <p className="text-xs font-bold opacity-60">{chatSubtitle}</p>}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowChatInfo((visible) => !visible);
              setShowPlusPanel(false);
            }}
            className="wechat-icon-button"
            aria-label="聊天信息"
            aria-expanded={showChatInfo}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>

      {showChatInfo && (
        <div className="absolute left-3 right-3 top-20 z-30 rounded-2xl border border-black/10 bg-white/95 p-4 text-[#1f2933] shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <WeChatAvatar src={character.avatar} name={character.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{character.name}</p>
              <p className="text-xs font-semibold text-[#6b7280]">
                {activeGroup ? `${groupMembers.length} 个成员` : activeChannel === 'qq' ? 'QQ 聊天' : '微信聊天'}
              </p>
            </div>
            <button type="button" onClick={() => setShowChatInfo(false)} className="wechat-mini-button">关闭</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#4b5563]">
            <div className="rounded-xl bg-[#f3f4f6] p-3">
              <span className="block text-[#9ca3af]">聊天记录</span>
              <strong className="text-sm text-[#111827]">{messages.length} 条</strong>
            </div>
            <div className="rounded-xl bg-[#f3f4f6] p-3">
              <span className="block text-[#9ca3af]">等待发送</span>
              <strong className="text-sm text-[#111827]">{pendingUserDrafts.length} 条</strong>
            </div>
          </div>
          {directCharacter && (
            <div className="mt-3 rounded-xl bg-[#f3f4f6] p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-[#111827]">这个角色的聊天背景</p>
                  <p className="mt-1 text-[10px] font-semibold text-[#6b7280]">微信和 QQ 私聊共用，不影响其他角色。</p>
                </div>
                {chatBackgroundImage && (
                  <PersistentImage src={chatBackgroundImage} alt="当前聊天背景" className="h-12 w-12 rounded-lg object-cover" />
                )}
              </div>
              <input ref={chatBackgroundInputRef} type="file" accept={customImageAccept} onChange={updateChatBackground} className="hidden" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => chatBackgroundInputRef.current?.click()} className="wechat-mini-button">
                  {chatBackgroundImage ? '更换图片' : '选择图片'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCharacter(directCharacter.id, { chatBackgroundImage: undefined });
                    setChatBackgroundStatus(`已恢复 ${directCharacter.name} 的主题默认背景。`);
                  }}
                  disabled={!chatBackgroundImage}
                  className="wechat-mini-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  恢复默认
                </button>
              </div>
              {chatBackgroundStatus && <p className="mt-2 text-[10px] font-bold text-[#4b5563]">{chatBackgroundStatus}</p>}
            </div>
          )}
          <p className="mt-3 text-xs font-semibold text-[#6b7280]">
            {getChatConnectionIssue() || `已连接：${selectedModel}`}
          </p>
        </div>
      )}

      <div className={cn('flex-1 overflow-y-auto px-4 py-4', isWechat && 'wechat-message-list', isQq && 'qq-message-list')}>
        {hiddenMessageCount > 0 && (
          <button
            type="button"
            className="wechat-load-older"
            onClick={() => setVisibleMessageCount((current) => Math.min(messages.length, current + 100))}
          >
            加载更早的消息（还有 {hiddenMessageCount} 条）
          </button>
        )}
        {messages.length === 0 && character.firstMessage && (
          <Bubble role="model" content={character.firstMessage} kind="text" channel={activeChannel} character={character} />
        )}
        {visibleMessages.map((message) => {
          const speaker = message.speakerId ? characters.find((item) => item.id === message.speakerId) : character;
          return (
            <Bubble
              key={message.id}
              role={message.role}
              content={message.content}
              kind={message.kind}
              duration={message.duration}
              transcript={message.transcript}
              stickerLabel={message.stickerLabel}
              favorite={message.favorite}
              replyTo={message.replyTo}
              amount={message.amount}
              note={message.note}
              itemName={message.itemName}
              status={message.status}
              voicePlayedAt={message.voicePlayedAt}
              timestamp={message.timestamp}
              showTools={!isSelectingMessages && activeToolMessageId === message.id}
              selectionMode={isSelectingMessages}
              selected={selectedMessageIds.includes(message.id)}
              channel={activeChannel}
              character={speaker || character}
              onToggleTools={() => {
                if (isSelectingMessages) {
                  toggleMessageSelection(message.id);
                  return;
                }
                setActiveToolMessageId((id) => (id === message.id ? null : message.id));
              }}
              onToggleSelected={() => toggleMessageSelection(message.id)}
              onStartSelection={() => startMessageSelection(message.id)}
              onDelete={message.role === 'model' ? () => deleteMessage(activeChatId, activeChannel, message.id) : undefined}
              onToggleFavorite={() => toggleMessageFavorite(activeChatId, activeChannel, message.id)}
              onCopy={() => navigator.clipboard?.writeText(describeChatMessage(message))}
              onReply={() => setReplyDraft(describeChatMessage(message).slice(0, 60))}
              onRecall={message.role === 'user'
                ? message.kind === 'call-note'
                  ? pendingUserDrafts.some((draft) => draft.sourceMessageId === message.id)
                    ? () => cancelCallNote(message.id)
                    : undefined
                  : () => recallMessage(activeChatId, activeChannel, message.id)
                : undefined}
              onVoicePlayed={() => markVoiceMessagePlayed(activeChatId, activeChannel, message.id)}
              onAcceptLifeCard={canAcceptLifeCard(message) ? () => acceptLifeCard(message) : undefined}
            />
          );
        })}
        {isTyping && !activeGroup && (
          <div className="wechat-typing">
            <span className="bubble-ornaments" aria-hidden="true"><i className="bubble-ornament bubble-ornament-a" /><i className="bubble-ornament bubble-ornament-b" /><i className="bubble-ornament bubble-ornament-c" /><i className="bubble-ornament bubble-ornament-d" /></span>
            <WeChatAvatar src={character.avatar} name={character.name} />
            <span>{character.name} 正在输入中</span>
            <i />
            <i />
            <i />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={cn('p-3', isWechat && 'wechat-input-bar', isQq && 'qq-input-bar')}>
        {isSelectingMessages && (
          <div className="wechat-selection-bar">
            <button type="button" onClick={cancelMessageSelection} className="wechat-selection-action" aria-label="取消多选">
              <X className="h-4 w-4" />
            </button>
            <span>已选择 {selectedMessageCount} 条</span>
            <button type="button" onClick={deleteSelectedMessages} className="wechat-selection-delete" disabled={selectedMessageCount === 0}>
              <Trash2 className="h-4 w-4" />
              <span>删除</span>
            </button>
          </div>
        )}
        {replyDraft && (
          <div className="wechat-reply-draft">
            <span>引用：{replyDraft}</span>
            <button type="button" onClick={() => setReplyDraft(null)}>取消</button>
          </div>
        )}
        {failedDraft && (
          <div className="wechat-failed-draft">
            <span>{failedDraft.drafts.length} 条消息还没等到回复。</span>
            {failedDraft.error && (
              <strong className="wechat-error-code">{failedDraft.error}</strong>
            )}
            <button type="button" onClick={retryFailed}>重试</button>
          </div>
        )}
        {showPlusPanel && (
          <div className="wechat-plus-panel">
            <button type="button" onClick={() => { setMode((current) => (current === 'voice' ? 'text' : 'voice')); setShowPlusPanel(false); }} className="wechat-plus-action">
              <Mic className="h-5 w-5" />
              <span>{mode === 'voice' ? '文字' : '语音条'}</span>
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()} className="wechat-plus-action">
              <ImagePlus className="h-5 w-5" />
              <span>图片</span>
            </button>
            {imageGenerationEnabled && (
              <button type="button" onClick={() => { setShowImageComposer(true); setImageDraft((current) => current || input.trim()); setImageGenerationError(''); }} className="wechat-plus-action">
                <Sparkles className="h-5 w-5" />
                <span>AI 生图</span>
              </button>
            )}
            <button type="button" onClick={() => addCallNote('voice')} className="wechat-plus-action">
              <Phone className="h-5 w-5" />
              <span>语音通话</span>
            </button>
            <button type="button" onClick={() => addCallNote('video')} className="wechat-plus-action">
              <Video className="h-5 w-5" />
              <span>视频通话</span>
            </button>
            <button type="button" onClick={() => setLifeComposer((current) => current === 'transfer' ? null : 'transfer')} className="wechat-plus-action">
              <RefreshCw className="h-5 w-5" />
              <span>转账</span>
            </button>
            <button type="button" onClick={() => setLifeComposer((current) => current === 'red-packet' ? null : 'red-packet')} className="wechat-plus-action">
              <Gift className="h-5 w-5" />
              <span>红包</span>
            </button>
            <button type="button" onClick={() => setLifeComposer((current) => current === 'shopping' ? null : 'shopping')} className="wechat-plus-action">
              <ShoppingBag className="h-5 w-5" />
              <span>购物</span>
            </button>
            {lifeComposer && (
              <div className="wechat-life-composer">
                <div className="grid grid-cols-2 gap-2">
                  {lifeComposer === 'shopping' && (
                    <input value={lifeDraft.itemName} onChange={(event) => setLifeDraft((draft) => ({ ...draft, itemName: event.target.value }))} placeholder="买了什么" />
                  )}
                  <input value={lifeDraft.amount} onChange={(event) => setLifeDraft((draft) => ({ ...draft, amount: event.target.value }))} placeholder={lifeComposer === 'red-packet' ? '红包金额' : '金额'} />
                  <input value={lifeDraft.note} onChange={(event) => setLifeDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="备注" />
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={sendLifeCard}>发送</button>
                  <button type="button" onClick={resetLifeDraft}>取消</button>
                </div>
              </div>
            )}
            {showImageComposer && (
              <div className="wechat-life-composer">
                <textarea
                  value={imageDraft}
                  onChange={(event) => { setImageDraft(event.target.value); setImageGenerationError(''); }}
                  onFocus={(event) => revealFocusedComposer(event.currentTarget)}
                  className="min-h-20 w-full resize-none"
                  placeholder="描述想生成的图片"
                />
                {imageGenerationError && (
                  <p className="wechat-error-code mt-2">{imageGenerationError}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={sendGeneratedImage} disabled={generatingImage}>
                    {generatingImage ? '生成中' : '生成并发送'}
                  </button>
                  <button type="button" onClick={() => { setImageDraft(''); setImageGenerationError(''); setShowImageComposer(false); }}>取消</button>
                </div>
              </div>
            )}
            <p className="wechat-plus-label">
              <SmilePlus className="h-4 w-4" />
              表情包
            </p>
            <div className="wechat-sticker-tray">
              {stickers.map((sticker) => (
                <button key={sticker.id} onClick={() => sendSticker(sticker)} className="wechat-sticker-send-button" title={sticker.label}>
                  <img src={sticker.url} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
        {isQq && (
          <div className="qq-compose-toolbar" aria-label="QQ 聊天工具栏">
            <button type="button" onClick={() => setShowPlusPanel((visible) => !visible)} aria-label="表情">
              <SmilePlus className="h-6 w-6" aria-hidden />
            </button>
            <button type="button" onClick={() => setShowPlusPanel((visible) => !visible)} aria-label="截图">
              <Scissors className="h-6 w-6" aria-hidden />
              <span className="qq-toolbar-chevron" aria-hidden>⌄</span>
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="文件">
              <Folder className="h-6 w-6" aria-hidden />
            </button>
            <button type="button" onClick={() => imageInputRef.current?.click()} aria-label="图片">
              <ImageIcon className="h-6 w-6" aria-hidden />
            </button>
            {imageGenerationEnabled && (
              <button
                type="button"
                onClick={() => {
                  setShowPlusPanel(true);
                  setShowImageComposer(true);
                  setImageDraft((current) => current || input.trim());
                  setImageGenerationError('');
                }}
                aria-label="AI 生图"
              >
                <Sparkles className="h-6 w-6" aria-hidden />
              </button>
            )}
            <button type="button" onClick={() => addCallNote('voice')} aria-label="语音通话">
              <Phone className="h-6 w-6" aria-hidden />
            </button>
            <button type="button" onClick={() => addCallNote('video')} aria-label="视频通话">
              <Video className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setLifeComposer((current) => current === 'red-packet' ? null : 'red-packet');
                setShowPlusPanel(true);
              }}
              aria-label="红包"
            >
              <Mail className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => { setMode((current) => (current === 'voice' ? 'text' : 'voice')); setShowPlusPanel(false); }}
              aria-label={mode === 'voice' ? '切换文字输入' : '切换语音条'}
            >
              <Mic className="h-6 w-6" aria-hidden />
            </button>
          </div>
        )}
        <div className="wechat-compose-row">
          {isQq && (
            <button
              type="button"
              onClick={() => { setMode((current) => (current === 'voice' ? 'text' : 'voice')); setShowPlusPanel(false); }}
              className={cn('circle-button small qq-compose-tool', mode === 'voice' && 'wechat-compose-button-active')}
              aria-label={mode === 'voice' ? '切换文字输入' : '切换语音条'}
            >
              <Mic className="h-5 w-5" aria-hidden />
            </button>
          )}
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={(event) => revealFocusedComposer(event.currentTarget)}
            onKeyDown={(event) => {
              if (!shouldSubmitChatComposerKey({ key: event.key, shiftKey: event.shiftKey })) return;
            }}
            placeholder={mode === 'voice' ? '语音文字' : '说点什么...'}
            rows={1}
            className="hand-input wechat-chat-input min-h-11 flex-1 resize-none"
          />
          <input ref={imageInputRef} type="file" accept="image/*" onChange={sendImage} className="hidden" />
          {isQq && (
            <button
              type="button"
              onClick={() => setShowPlusPanel((visible) => !visible)}
              className={cn('circle-button small qq-compose-tool', showPlusPanel && 'wechat-compose-button-active')}
              aria-label="打开表情和功能"
            >
              <SmilePlus className="h-5 w-5" aria-hidden />
            </button>
          )}
          <button
            onClick={() => setShowPlusPanel((visible) => !visible)}
            className={cn('circle-button small', showPlusPanel && 'wechat-compose-button-active')}
            aria-label={showPlusPanel ? '关闭更多功能' : '打开更多功能'}
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
          <button
            onClick={send}
            className={cn('circle-button small wechat-compose-send', isQq && !input.trim() && pendingUserDrafts.length === 0 && 'qq-send-idle')}
            aria-label={input.trim() ? '发送消息' : '请求回复'}
          >
            {isQq
              ? sending
                ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
                : <span className="qq-send-label">{input.trim() ? '发送' : '回复'}</span>
              : sending
                ? <RefreshCw className="h-5 w-5 animate-spin" aria-hidden />
                : <Send className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
    </section>
  );
}
