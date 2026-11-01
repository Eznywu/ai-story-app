"use client";

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
  return (
    <div className="voiceFlow">
      <p>
        {props.language.toLowerCase().startsWith("zh")
          ? "請到建立故事的畫面加入我的聲音。需要先同意，而且要登入自己的帳號。"
          : "Add a voice from the create screen. It asks for consent and a signed-in account."}
      </p>
      {props.hasClone ? <p>{props.language.toLowerCase().startsWith("zh") ? "這個帳號已有聲音。" : "This account already has a voice."}</p> : null}
      <button type="button" className="createScreen__submit" disabled={props.disabled} onClick={props.onChooseNarrator}>
        {props.language.toLowerCase().startsWith("zh") ? "選擇故事聲音" : "Choose a story voice"}
      </button>
      <button type="button" onClick={props.onClearClone}>
        {props.language.toLowerCase().startsWith("zh") ? "重新整理清單" : "Refresh the list"}
      </button>
    </div>
  );
}
