import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatModelComponent } from './chat-model.component';

describe('ChatModelComponent', () => {
  let component: ChatModelComponent;
  let fixture: ComponentFixture<ChatModelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChatModelComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatModelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
