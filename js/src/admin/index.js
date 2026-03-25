import Extend from 'flarum/common/extenders';
import MenuControlPage from './components/MenuControlPage';

export const extend = [
  new Extend.Admin().page(MenuControlPage),
];
