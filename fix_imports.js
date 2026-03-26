const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components/admin/settings');

function walk(directory) {
    let results = [];
    const list = fs.readdirSync(directory);
    list.forEach(file => {
        file = path.join(directory, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk(dir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // Fix UI imports
    if (content.includes('from "../ui/')) {
        content = content.replace(/from "\.\.\/ui\//g, 'from "../../ui/');
        changed = true;
    }

    // Fix ShopContext imports
    if (content.includes('from "../../contexts/ShopContext"')) {
        content = content.replace(/import { useShop } from "\.\.\/\.\.\/contexts\/ShopContext";/g, 'const useShop = () => ({ currentShop: null, loading: false });');
        changed = true;
    }

    // Replace Remix Router hooks with React Router DOM / Mocks
    if (content.match(/from "react-router"/)) {
        if (file.includes('AccountSettings.tsx')) {
            content = content.replace(/import { useNavigate, useRouteLoaderData } from "react-router";/g, 'import { useNavigate } from "react-router-dom";\nconst useRouteLoaderData = (z: any) => ({});');
            changed = true;
        }
        if (file.includes('UserManagementSettings.tsx')) {
            content = content.replace(/import { useFetcher, useRouteLoaderData } from "react-router";/g, 'const useRouteLoaderData = (z: any) => ({});\nconst useFetcher = () => ({ submit: () => {}, state: "idle", Form: (props: any) => <form {...props} /> });');
            changed = true;
        }
        if (file.includes('TagsSettings.tsx')) {
            content = content.replace(/import { useActionData, useSubmit, useNavigation } from "react-router";/g, 'const useActionData = () => null;\nconst useSubmit = () => () => {};\nconst useNavigation = () => ({ state: "idle" });');
            changed = true;
        }
        if (file.includes('CommunicationSettings.tsx')) {
            content = content.replace(/import { useSubmit, useNavigation, useActionData } from "react-router";/g, 'const useActionData = () => null;\nconst useSubmit = () => () => {};\nconst useNavigation = () => ({ state: "idle" });');
            changed = true;
        }
        if (file.includes('VerifyDeviceModal.tsx')) {
            content = content.replace(/import { useSubmit } from "react-router";/g, 'const useSubmit = () => () => {};');
            changed = true;
        }
        if (file.includes('BrandingSettings.tsx')) {
            content = content.replace(/import { useSubmit, useNavigation, useActionData } from "react-router";/g, 'const useActionData = () => null;\nconst useSubmit = () => () => {};\nconst useNavigation = () => ({ state: "idle" });');
            changed = true;
        }
    }

    // Add manual checks for other useFetcher imports
    if (content.includes('import { useFetcher')) {
        content = content.replace(/import {.*useFetcher.*} from "@?(remix-run\/react|react-router)";?/g, 'const useFetcher = () => ({ submit: () => {}, state: "idle", Form: (props: any) => <form {...props} /> });');
        changed = true;
    }
    
    // AdminTaggedShipments Types Fix
    if (file.includes('AdminTaggedShipments.tsx')) {
        content = content.replace(/order\.status === "cooldown"/g, 'order.status === ("cooldown" as any)');
        content = content.replace(/order\.status === "active"/g, 'order.status === ("active" as any)');
        content = content.replace(/order\.status === "expired"/g, 'order.status === ("expired" as any)');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
