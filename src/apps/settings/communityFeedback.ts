export const communityFeedbackUrl = 'https://discord.gg/VpM25X3edm';

type FeedbackLinkHost = {
  ReactNativeWebView?: { postMessage?: (message: string) => void };
  location?: { assign?: (url: string) => void };
};

export function openCommunityFeedback(host: FeedbackLinkHost = window as unknown as FeedbackLinkHost) {
  if (host.ReactNativeWebView?.postMessage) {
    host.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'open-url',
      url: communityFeedbackUrl,
    }));
    return 'native' as const;
  }

  host.location?.assign?.(communityFeedbackUrl);
  return 'browser' as const;
}
