export const LIVE_PUBLISH_ROLES=["HOST","COHOST","SPEAKER"] as const;
export function canPublishLiveMedia(role:string|null|undefined){return Boolean(role&&LIVE_PUBLISH_ROLES.includes(role as any))}
export function stopStream(stream:MediaStream|null){if(stream)stream.getTracks().forEach(track=>track.stop())}