import { Component, OnInit } from '@angular/core';
import { Device } from '@ionic-enterprise/identity-vault';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit(): void {
    Device.setHideScreenOnBackground(true);
  }
}
