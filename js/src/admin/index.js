import app from 'flarum/admin/app';
import MenuControlPage from './components/MenuControlPage';

export { MenuControlPage };

app.initializers.add('resofire-menu-control', () => {
  app.extensionData
    .for('resofire-menu-control')
    .registerPage(MenuControlPage);
});
