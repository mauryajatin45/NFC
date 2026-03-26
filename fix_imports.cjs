const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/admin/settings');

function walk(directory) {
    let results = [];
    const list = fs.readdirSync(directory);
    list.forEach(file => {
        const fullPath = path.join(directory, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk(dir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes('from "../ui/')) {
        content = content.replace(/from "\.\.\/ui\//g, 'from "../../ui/');
        changed = true;
    }

    if (content.includes('from "../../contexts/ShopContext"')) {
        content = content.replace(/import { useShop } from "\.\.\/\.\.\/contexts\/ShopContext";/g, 'const useShop = () => ({ currentShop: null, loading: false });');
        changed = true;
    }

    if (content.match(/from "react-router"/)) {
        if (file.includes('AccountSettings.tsx')) {
            content = content.replace(/import { useNavigate, useRouteLoaderData } from "react-router";/g, 'import { useNavigate } from "react-router-dom";\nconst useRouteLoaderData = (z: any) => ({});');
            changed = true;
        } else if (file.includes('UserManagementSettings.tsx')) {
            content = content.replace(/import { useFetcher, useRouteLoaderData } from "react-router";/g, 'const useRouteLoaderData = (z: any) => ({});\nconst useFetcher = () => ({ submit: () => {}, state: "idle", Form: (props: any) => <form {...props} /> });');
            changed = true;
        } else if (file.includes('TagsSettings.tsx')) {
            content = content.replace(/import { useActionData, useSubmit, useNavigation } from "react-router";/g, 'const useActionData = () => null;\nconst useSubmit = () => () => {};\nconst useNavigation = () => ({ state: "idle" });');
            changed = true;
        } else if (file.includes('CommunicationSettings.tsx')) {
            content = content.replace(/import { useSubmit, useNavigation, useActionData } from "react-router";/g, 'const useActionData = () => null;\nconst useSubmit = () => () => {};\nconst useNavigation = () => ({ state: "idle" });');
            changed = true;
        } else if (file.includes('VerifyDeviceModal.tsx')) {
            content = content.replace(/import { useSubmit } from "react-router";/g, 'const useSubmit = () => () => {};');
            changed = true;
        } else if (file.includes('BrandingSettings.tsx')) {
            content = content.replace(/import { useSubmit, useNavigation, useActionData } from "react-router";/g, 'const useActionData = () => null;\nconst useSubmit = () => () => {};\nconst useNavigation = () => ({ state: "idle" });');
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
