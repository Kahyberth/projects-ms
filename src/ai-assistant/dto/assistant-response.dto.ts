export class AssistantActionDto {
    type: 'schedule_event' | 'send_report' | 'suggest_workflow';
    label: string;
    payload: Record<string, any>;
  }
  
  export class AssistantResponseDto {
    replyText: string;
    actions?: AssistantActionDto[];
  }