import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { PinDialogService } from './pin-dialog.service';

@Component({
  selector: 'app-pin-dialog',
  templateUrl: './pin-dialog.component.html',
  styleUrls: ['./pin-dialog.component.scss'],
})
export class PinDialogComponent implements OnInit, OnDestroy {
  @Input() setPasscodeMode: boolean;
  @Input() error: null | boolean;

  displayPin: string;
  errorMessage: string;
  pin: string;
  prompt: string;
  title: string;

  private verifyPin: string;
  private subscription: Subscription;

  constructor(private modalController: ModalController, private pinDialogService: PinDialogService) {}

  get disableEnter(): boolean {
    return !(this.pin.length > 2);
  }

  get disableDelete(): boolean {
    return !this.pin.length;
  }

  get disableInput(): boolean {
    return !!(this.pin.length > 8);
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  ngOnInit() {
    if (this.setPasscodeMode) {
      this.initSetPasscodeMode();
    } else {
      this.initUnlockMode();
    }

    this.subscription = this.pinDialogService.onPinStatus.subscribe((canClose) => {
      console.log('PinDialogComponent onPinStatus', canClose);
      if (canClose) {
        this.modalController.dismiss();
      } else {
        this.errorMessage = 'Invalid Passcode';
        this.error = true;
        this.pin = '';
        this.setDisplayPin();
      }
    });

    if (this.error) {
      this.errorMessage = 'Invalid Passcode';
    }
  }

  append(n: number) {
    this.errorMessage = '';
    this.pin = this.pin.concat(n.toString());
    this.setDisplayPin();
  }

  delete() {
    if (this.pin) {
      this.pin = this.pin.slice(0, this.pin.length - 1);
    }
    this.setDisplayPin();
  }

  enter() {
    if (this.setPasscodeMode) {
      if (!this.verifyPin) {
        this.initVerifyMode();
      } else if (this.verifyPin === this.pin) {
        this.pinDialogService.pinAttempt(this.pin);
      } else {
        this.errorMessage = 'PINS do not match';
        this.initSetPasscodeMode();
      }
    } else {
      this.pinDialogService.pinAttempt(this.pin);
    }
  }

  cancel() {
    this.modalController.dismiss(undefined, 'cancel');

    // This lets us clear the pin dialog singleton so it can be created again
    this.pinDialogService.pinStatus(true);
  }

  private initSetPasscodeMode() {
    this.prompt = 'Create Session PIN';
    this.title = 'Create PIN';
    this.verifyPin = '';
    this.displayPin = '';
    this.pin = '';
  }

  private initUnlockMode() {
    this.prompt = 'Enter PIN to Unlock';
    this.title = 'Unlock';
    this.displayPin = '';
    this.pin = '';
  }

  private initVerifyMode() {
    this.prompt = 'Verify PIN';
    this.verifyPin = this.pin;
    this.displayPin = '';
    this.pin = '';
  }

  private setDisplayPin() {
    this.displayPin = '*********'.slice(0, this.pin.length);
  }
}
