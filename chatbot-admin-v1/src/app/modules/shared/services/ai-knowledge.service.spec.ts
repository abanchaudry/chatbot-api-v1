import { TestBed } from '@angular/core/testing';

import { AiKnowledgeService } from './ai-knowledge.service';

describe('AiKnowledgeService', () => {
  let service: AiKnowledgeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiKnowledgeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
