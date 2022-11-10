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

  // canClose means the pin dialog should close because the user entered the right pin or canceled or failed too many times
  pinStatus(canClose: boolean): void {
    this.onPinStatus.emit(canClose);
  }
}
