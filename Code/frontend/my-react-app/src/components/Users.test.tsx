// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Users from '../views/admin/Users';
import { graphqlRequest } from '../api/graphql';
vi.mock('../api/graphql',()=>({graphqlRequest:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('UC-A72: a mismatched confirmation never invokes createUser',async()=>{vi.mocked(graphqlRequest).mockResolvedValue({usersPage:{nodes:[],totalCount:0}});render(<Users/>);fireEvent.click(screen.getByRole('button',{name:'Add User'}));fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Pat'}});fireEvent.change(screen.getByLabelText('Email'),{target:{value:'pat@example.test'}});fireEvent.change(screen.getByLabelText('Password',{exact:true}),{target:{value:'long-password-one'}});fireEvent.change(screen.getByLabelText('Confirm Password'),{target:{value:'long-password-two'}});fireEvent.submit(screen.getByRole('button',{name:'Create User'}).closest('form')!);expect(await screen.findByText('Passwords do not match')).toBeVisible();await waitFor(()=>expect(vi.mocked(graphqlRequest).mock.calls.every(([query])=>!query.includes('createUser'))).toBe(true));});
