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
} from '@ionic-enterprise/identity-vault';
import { ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
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
  private pinAttemptSubscription: Subscription;
  private pinStatusSubscription: Subscription;
  private pinDialog: any;

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
      this.pinDialogService.pinStatus(true);
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
    if ((await this.vault.doesVaultExist()) && (await this.vault.isLocked())) {
      return true;
    }
    return false;
  }

  private async onPasscodeRequest(isPasscodeSetRequest: boolean, onComplete: OnCompleteFunction): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (this.pinAttemptSubscription) {
        this.pinAttemptSubscription.unsubscribe();
      }

      this.pinAttemptSubscription = this.pinDialogService.onPinAttempt.subscribe(async (pin: string) => {
        try {
          console.log(`onComplete(${pin});`);
          onComplete(pin);

          if (isPasscodeSetRequest) {
            // We want to close the dialog because we are actually setting
            console.log('setting pin done');
            this.pinDialogService.pinStatus(true);
            resolve();
            return;
          }

          resolve();
        } catch (error) {
          // An error code 6 will occur on a failure
          if (error?.code) {
            this.pinDialogService.pinStatus(false);
            // Failed PIN
          }
          console.error('onPasscodeRequest error', error);
          reject();
          return;
        }
        resolve();
      });

      if (this.pinStatusSubscription) {
        this.pinStatusSubscription.unsubscribe();
      }

      this.pinStatusSubscription = this.pinDialogService.onPinStatus.subscribe((success) => {
        if (success) {
          this.pinDialog = undefined;
        }
      });

      if (this.pinDialog) {
        console.warn('Pin dialog already exists return resolved promise');
        return Promise.resolve(); // Only create one pin dialog
      }

      this.pinDialog = await this.modalController.create({
        backdropDismiss: false,
        component: PinDialogComponent,
        componentProps: {
          setPasscodeMode: isPasscodeSetRequest,
        },
      });
      this.vault.onUnlock(async () => {
        console.log('vault was unlocked so call it a success');
        this.pinDialogService.pinStatus(true);
        this.navController.navigateRoot(['/']);
      });
      this.vault.onError((err) => {
        console.error('onPasscodeRequest', err);
        if (err?.code === 7) {
          // vault was cleared due to invalid attempts
          // We need to force the pin dialog to close

          this.pinDialogService.pinStatus(true);
        } else {
          this.pinDialogService.pinStatus(false);
          console.log('rejected promise');
          reject();
          return;
        }
        console.log('resolved promise');
        resolve();
      });
      console.log('onPasscodeRequest', isPasscodeSetRequest);

      await this.pinDialog.present();
    });
  }

  private async onError(err: VaultError): Promise<void> {
    console.log('SessionVaultService onError', err);
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
