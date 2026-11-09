import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../../shared/components/icon.component';
import type { Role } from '../../shared/models/api.models';
import { MockAuthService } from '../auth/mock-auth.service';
import { APP_CONFIG } from '../config/app-config';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly auth = inject(MockAuthService);
  protected readonly appName = inject(APP_CONFIG).applicationName;

  protected readonly nav: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/learning', label: 'Learning', icon: 'learning' },
    { path: '/plan', label: 'Plan', icon: 'plan' },
    { path: '/assistant', label: 'Assistant', icon: 'assistant' },
    { path: '/profile', label: 'Profile', icon: 'profile' },
  ];

  protected readonly adminNav: NavItem[] = [
    { path: '/admin/courses', label: 'Courses', icon: 'admin' },
    { path: '/admin/demand', label: 'Demand', icon: 'admin' },
  ];

  protected onRoleChange(role: Role): void {
    this.auth.setRole(role);
  }
}
