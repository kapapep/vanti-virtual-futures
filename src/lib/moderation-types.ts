export type ModerationVerdict = { explicit: boolean; reason: string };

export type ModerationInput = {
  body?: string | undefined;
  imageDataUrl?: string | undefined;
  audioDataUrl?: string | undefined;
  audioFormat?: string | undefined;
};
