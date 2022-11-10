import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class PinDialogService {
  onPinAttempt: EventEmitter<string> = new EventEmitter();
  onPinStatus: EventEmitter<boolean> = new EventEmitter();

  pinAttempt(pin: string): void {
    this.onPinAttempt.emit(pin);
  }

  pinStatus(success: boolean): void {
    this.onPinStatus.emit(success);
  }
}
