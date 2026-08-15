import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChunckInfoComponent } from './chunck-info.component';

describe('ChunckInfoComponent', () => {
  let component: ChunckInfoComponent;
  let fixture: ComponentFixture<ChunckInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ChunckInfoComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChunckInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
