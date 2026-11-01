"use client";

import { useInterfaceLocale } from "@/app/components/LocaleProvider";

type Props = {
  language: string;
  disabled?: boolean;
  hasClone: boolean;
  onCloned: (voiceId: string, label: string, requiresVerification: boolean) => void;
  onClearClone: () => void;
  onChooseNarrator?: () => void;
};

/** Older entry point. Personal voices are created from the Create screen after consent. */
export function VoiceRecorder(props: Props) {
  const { messages } = useInterfaceLocale();
  const copy = messages.recorder;
  return (
    <div className="voiceFlow">
      <p>{copy.fromCreate}</p>
      {props.hasClone ? <p>{copy.hasVoice}</p> : null}
      <button type="button" className="createScreen__submit" disabled={props.disabled} onClick={props.onChooseNarrator}>
        {copy.choose}
      </button>
      <button type="button" onClick={props.onClearClone}>
        {copy.refresh}
      </button>
    </div>
  );
}
