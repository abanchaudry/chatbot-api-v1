import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllChunksComponent } from './all-chunks.component';

describe('AllChuncksComponent', () => {
  let component: AllChunksComponent;
  let fixture: ComponentFixture<AllChunksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AllChunksComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllChunksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
