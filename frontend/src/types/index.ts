export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
}

export interface MediaControlsState {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isDeafened: boolean;
}

export type ConnectionStatus =
  | "connected"
  | "connecting"
  | "disconnected"
  | "poor";

export type Page = "home" | "screen-share";
