import type { ExampleDefinition } from '../../app/examples';
import { LoginPage } from '../../features/authentication/LoginPage';

const loginPreview: ExampleDefinition = {
  id: 'login', title: 'Sign in', component: LoginPage, standalone: true,
  states: ['default'],
};
export default loginPreview;
