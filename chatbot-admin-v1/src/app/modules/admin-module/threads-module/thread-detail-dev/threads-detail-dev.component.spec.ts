import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadsDetailDevComponent } from './threads-detail-dev.component';

describe('ThreadsDetailComponent', () => {
  let component: ThreadsDetailDevComponent;
  let fixture: ComponentFixture<ThreadsDetailDevComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ThreadsDetailDevComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreadsDetailDevComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
