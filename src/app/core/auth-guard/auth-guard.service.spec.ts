import { TestBed } from '@angular/core/testing';
import { SessionVaultService } from '@app/core';
import { createSessionVaultServiceMock } from '@app/core/testing';
import { selectAuthToken } from '@app/store';
import { NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { createNavControllerMock } from '@test/mocks';
import { AuthGuardService } from './auth-guard.service';

describe('AuthGuardService', () => {
  let service: AuthGuardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore(),
        { provide: NavController, useFactory: createNavControllerMock },
        {
          provide: SessionVaultService,
          useFactory: createSessionVaultServiceMock,
        },
      ],
    });
    service = TestBed.inject(AuthGuardService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('when a token exists in the state', () => {
    beforeEach(() => {
      const store = TestBed.inject(Store) as MockStore;
      store.overrideSelector(selectAuthToken, '294905993');
    });

    it('does not navigate', (done) => {
      const navController = TestBed.inject(NavController);
      service.canActivate().subscribe(() => {
        expect(navController.navigateRoot).not.toHaveBeenCalled();
        done();
      });
    });

    it('emits true', (done) => {
      service.canActivate().subscribe((response) => {
        expect(response).toBe(true);
        done();
      });
    });
  });

  describe('when a token does not exist in the state', () => {
    beforeEach(() => {
      const store = TestBed.inject(Store) as MockStore;
      store.overrideSelector(selectAuthToken, '');
    });

    describe('with a stored session', () => {
      beforeEach(() => {
        const sessionVault = TestBed.inject(SessionVaultService);
        (sessionVault.restoreSession as any).and.returnValue(
          Promise.resolve({
            user: {
              id: 42,
              firstName: 'Joe',
              lastName: 'Tester',
              email: 'test@test.org',
            },
            token: '19940059fkkf039',
          })
        );
      });

      it('does not navigate', (done) => {
        const navController = TestBed.inject(NavController);
        service.canActivate().subscribe(() => {
          expect(navController.navigateRoot).not.toHaveBeenCalled();
          done();
        });
      });

      it('emits true', (done) => {
        service.canActivate().subscribe((response) => {
          expect(response).toBe(true);
          done();
        });
      });
    });

    describe('without a stored session', () => {
      it('navigates to the login page', (done) => {
        const navController = TestBed.inject(NavController);
        service.canActivate().subscribe(() => {
          expect(navController.navigateRoot).toHaveBeenCalledTimes(1);
          expect(navController.navigateRoot).toHaveBeenCalledWith(['/', 'login']);
          done();
        });
      });

      it('emits false', (done) => {
        service.canActivate().subscribe((response) => {
          expect(response).toBe(false);
          done();
        });
      });
    });
  });
});
