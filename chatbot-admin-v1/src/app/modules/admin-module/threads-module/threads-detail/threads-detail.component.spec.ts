import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreadsDetailComponent } from './threads-detail.component';

describe('ThreadsDetailComponent', () => {
  let component: ThreadsDetailComponent;
  let fixture: ComponentFixture<ThreadsDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ThreadsDetailComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreadsDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
