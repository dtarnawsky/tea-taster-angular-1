import { EventEmitter, Injectable } from '@angular/core';
import { Session } from '@app/models';
import { PinDialogComponent } from '@app/pin-dialog/pin-dialog.component';
import { PinDialogService } from '@app/pin-dialog/pin-dialog.service';
import { sessionLocked, sessionRestored } from '@app/store/actions';
import {
  BrowserVault,
  DeviceSecurityType,
  IdentityVaultConfig,
  Vault,
  VaultType,
  VaultError,
  VaultErrorCodes,
} from '@ionic-enterprise/identity-vault';
import { ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { filter, tap } from 'rxjs';
import { VaultFactoryService } from './vault-factory.service';

export type UnlockMode = 'Device' | 'SessionPIN' | 'NeverLock' | 'ForceLogin';
type OnCompleteFunction = (code: string) => void;

@Injectable({
  providedIn: 'root',
})
export class SessionVaultService {
  private vault: BrowserVault | Vault;
  private session: Session;
  private sessionKey = 'session';
  private pinDialog: HTMLIonModalElement;

  constructor(
    private modalController: ModalController,
    private store: Store,
    vaultFactory: VaultFactoryService,
    private navController: NavController,
    private pinDialogService: PinDialogService
  ) {
    const config: IdentityVaultConfig = {
      key: 'com.kensodemann.tea-taster',
      type: VaultType.SecureStorage,
      lockAfterBackgrounded: 5000,
      shouldClearVaultAfterTooManyFailedAttempts: true,
      customPasscodeInvalidUnlockAttempts: 2,
      unlockVaultOnLoad: false,
    };

    this.vault = vaultFactory.create(config);

    this.vault.onLock(() => {
      this.session = undefined;
      console.log('vault lock occurred');
      this.store.dispatch(sessionLocked());
    });

    this.vault.onUnlock(() => {
      console.log('vault was unlocked so call it a success');
      this.pinDialogService.pinStatus(true);

      // This ensures we go away from the login page on successful unlock of the vault
      this.navController.navigateRoot(['/']);
    });

    this.vault.onPasscodeRequested(async (isPasscodeSetRequest: boolean, onComplete: OnCompleteFunction) =>
      this.onPasscodeRequest(isPasscodeSetRequest, onComplete)
    );

    this.vault.onError((err) => {
      this.onError(err);
    });
  }

  async login(session: Session, unlockMode: UnlockMode): Promise<void> {
    await this.setUnlockMode(unlockMode);
    this.session = session;
    await this.vault.setValue(this.sessionKey, session);
  }

  async logout(): Promise<void> {
    this.session = undefined;
    this.setUnlockMode('NeverLock');
    return this.vault.clear();
  }

  async lock(): Promise<void> {
    await this.vault.lock();
    console.log('vault lock done');
  }

  async restoreSession(): Promise<Session> {
    if (!this.session) {
      this.session = await this.vault.getValue(this.sessionKey);
      if (this.session) {
        this.store.dispatch(sessionRestored({ session: this.session }));
      }
    }
    return this.session;
  }

  async canUnlock(): Promise<boolean> {
    if (!(await this.vault.isEmpty()) && (await this.vault.isLocked())) {
      return true;
    }
    return false;
  }

  async clear(): Promise<void> {
    await this.vault.clear();
  }

  private async onPasscodeRequest(isPasscodeSetRequest: boolean, onComplete: OnCompleteFunction): Promise<void> {
    const thread = Math.random();
    console.log(`${thread}: onPasscodeRequest`);
    return new Promise(async (resolve, reject) => {
      const dialog = await this.getPinDialog(isPasscodeSetRequest);
      console.log(`${thread}: onPinAttempt subscribed`);
      const sub = this.pinDialogService.onPinAttempt.subscribe(async (pin: string) => {
        try {
          console.log(`${thread}:setCustomPasscode(${pin})`);
          await this.vault.setCustomPasscode(pin);
        } finally {
          resolve();
          sub.unsubscribe();
          console.log(`${thread}:resolved`);
        }
      });
    });
  }

  private async getPinDialog(isPasscodeSetRequest: boolean): Promise<HTMLIonModalElement> {
    if (this.pinDialog) {
      return this.pinDialog;
    }
    this.pinDialog = await this.modalController.create({
      backdropDismiss: false,
      component: PinDialogComponent,
      componentProps: {
        setPasscodeMode: isPasscodeSetRequest,
      },
    });

    // When we get success we need to clear the singleton for our pinDialog
    const sub = this.pinDialogService.onPinStatus
      .pipe(
        filter((success) => success),
        tap(() => {
          console.log('Pin Dialog was closed');
          this.pinDialog = undefined;
          sub.unsubscribe();
        })
      )
      .subscribe();
    await this.pinDialog.present();
    return this.pinDialog;
  }

  private async onError(err: VaultError): Promise<void> {
    console.log('SessionVaultService onError', err);
    if (err?.code === VaultErrorCodes.TooManyFailedAttempts) {
      // vault was cleared due to invalid attempts
      // We need to force the pin dialog to close
      this.pinDialogService.pinStatus(true);
    }
    if (err?.code === VaultErrorCodes.AuthFailed) {
      // This lets the pin dialog know we have a failure
      this.pinDialogService.pinStatus(false);

      // This reattempts an unlock
      this.vault.unlock();
    }

    // We get reports that the passcode is not setup yet but it actually is so we have to ignore these
    if (err?.code === VaultErrorCodes.MissingPasscode) {
      console.warn(
        'Identity Vault reported that the passcode is not setup but it is so this is a bug and we should ignore this error code!'
      );
    }
  }

  private setUnlockMode(unlockMode: UnlockMode): Promise<void> {
    let type: VaultType;
    let deviceSecurityType: DeviceSecurityType;

    switch (unlockMode) {
      case 'Device':
        type = VaultType.DeviceSecurity;
        deviceSecurityType = DeviceSecurityType.Both;
        break;

      case 'SessionPIN':
        type = VaultType.CustomPasscode;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      case 'ForceLogin':
        type = VaultType.InMemory;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      case 'NeverLock':
        type = VaultType.SecureStorage;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
        break;

      default:
        type = VaultType.SecureStorage;
        deviceSecurityType = DeviceSecurityType.SystemPasscode;
    }

    return this.vault.updateConfig({
      ...this.vault.config,
      type,
      deviceSecurityType,
    });
  }
}
