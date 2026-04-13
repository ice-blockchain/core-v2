export class ActionError<TCode extends string = string> extends Error {
  code: TCode;
  userMessage: string;

  constructor(code: TCode, userMessage: string) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.name = "ActionError";
  }
}
