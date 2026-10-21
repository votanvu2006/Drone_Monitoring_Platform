import type { ExampleDefinition } from '../../app/examples';
import { LoginPage } from './LoginPage';

export default {
  id: 'login', title: 'Sign in', component: LoginPage, standalone: true,
  states: ['default', 'validation-error', 'loading', 'login-error'],
} satisfies ExampleDefinition;
